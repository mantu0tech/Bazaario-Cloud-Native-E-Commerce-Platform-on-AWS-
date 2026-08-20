# Bazaario — Architecture Explained: Components, Assumptions, Dependencies, Security, Validation

This walks through everything you built, phase by phase, answering: *what is it, why does it depend on what it depends on, what did I assume that could be wrong for you, what's the actual security posture, and how do you prove each piece works.*

---

## Phase 1: Terraform Infrastructure

### Major components

| Component | What it actually does |
|---|---|
| **VPC module** (community `terraform-aws-modules/vpc`) | 3 AZs, public + private subnets, 1 NAT gateway. Public subnets hold the ALB + jump server; private subnets hold EKS nodes + RDS — nothing in private subnets has a route to the internet except *outbound* via NAT. |
| **EKS module** (community `terraform-aws-modules/eks`) | The control plane (AWS-managed) + a managed node group of EC2 instances (`t3.medium` x2-4) that actually run your pods. `authentication_mode = API_AND_CONFIG_MAP` enables the modern access-entry system used to grant the jump server kubectl access. |
| **`modules/jump-server`** | A bastion EC2 in the public subnet. It's the *only* thing with SSH exposed, and the *only* practical way to reach the EKS API and run `kubectl`/`helm` in this setup. |
| **`modules/rds`** | Managed MySQL 8, private subnet only, `publicly_accessible = false`. |
| **`modules/secrets-manager`** | One JSON secret holding DB host/port/name/user/password + JWT secret. |
| **`modules/iam-irsa`** | Two IAM roles federated to the cluster's OIDC provider — one for the ALB controller (so it can create real AWS load balancers), one for External Secrets Operator (so it can read Secrets Manager). |
| **`modules/ecr`** | Two private image repositories, vulnerability scan-on-push enabled. |

### Assumptions I made (check these against your reality)

- **Single NAT gateway** (`single_nat_gateway = true`) — cheaper, but it's a single point of failure for outbound traffic from private subnets. Fine for dev/learning; for production you'd want one NAT per AZ.
- **`cluster_endpoint_public_access = true`** — the EKS API is reachable from the internet (with IAM auth still required). I did this for convenience so your laptop's `kubectl` could also work. In a stricter environment you'd set `cluster_endpoint_public_access_cidrs` to just your office/VPN range, or `false` entirely and rely only on the jump server.
- **`skip_final_snapshot = true` and `deletion_protection = false` on RDS** — means `terraform destroy` deletes your database with no safety net. That's intentional for a learning/dev environment; flip both to the opposite for anything real.
- **Jump server has broad `0.0.0.0/0` SSH by default** unless you set `jump_server_allowed_ssh_cidr` — I called this out originally but it's worth re-checking your actual `terraform.tfvars` now that things are live.

### Dependency graph (why the files are ordered the way they are)

```
vpc → jump-server → eks → rds → secrets-manager → iam-irsa
                              ↘ (root-level SG rule) ↙
                         jump-server ←→ rds security group
```

The one non-obvious design choice: the jump server's IAM policy references the Secrets Manager ARN via a **predictable string pattern** (`account_id` + `region` + name), not an actual Terraform resource reference. That's what breaks what would otherwise be a circular dependency (jump-server needs to read secrets → secrets needs RDS → RDS needs EKS → EKS needs jump-server's role for cluster access). Worth remembering if you ever refactor this — reintroducing a real reference there will bring the cycle back.

### Security considerations, honestly assessed

- ✅ RDS is genuinely unreachable from the internet — only the EKS node security group and the jump server can reach port 3306.
- ✅ No long-lived AWS credentials anywhere — IRSA for in-cluster AWS access, and (once you fixed it) OIDC for GitHub Actions.
- ✅ Secrets never sit in git, Docker images, or Kubernetes manifests in plaintext — they flow Secrets Manager → External Secrets Operator → a K8s Secret, at deploy time.
- ⚠️ The jump server is a single point of both access *and* risk — anyone who compromises it (or its key pair) has a path to your whole cluster and can read your DB credentials. Treat that `.pem` file like a production credential.
- ⚠️ `AmazonEKSClusterAdminPolicy` granted to the jump server's role is full cluster-admin — appropriate for a learning setup where you *are* the ops team, but in a real org you'd scope this down (e.g. namespace-scoped view/edit access) and use per-engineer IAM identities instead of one shared bastion.
- ⚠️ ECR image scanning is enabled but nothing in this pipeline currently *blocks* a deploy if scan results come back critical — it's informational only right now.

### How to validate this phase

```bash
terraform state list                      # every resource you expect actually exists in state
terraform plan                            # should show "No changes" if nothing drifted
aws eks describe-cluster --name <cluster> --query cluster.status   # "ACTIVE"
aws rds describe-db-instances --db-instance-identifier <id> --query 'DBInstances[0].DBInstanceStatus'  # "available"
```
And the SSH+kubectl check you already did in Step 2 — that's the real end-to-end proof this phase worked.

---

## Phase 2: Manual EKS Deployment

### Major components

| Component | What it does |
|---|---|
| **Docker images** (multi-stage frontend build → Nginx; backend → Node/Express) | What actually runs in pods. |
| **`k8s/base/backend.yaml` / `frontend.yaml`** | Deployments + Services. Backend has readiness/liveness probes on `/api/health`; both request modest CPU/memory with limits set. |
| **`external-secret.yaml`** | Tells External Secrets Operator: pull `bazaario-dev/app-secrets` from Secrets Manager, materialize it as a K8s Secret the backend consumes via `envFrom`. |
| **`ingress.yaml`** | ALB Ingress — this is what turns into a real internet-facing Application Load Balancer once the ALB controller sees it. |
| **`kustomization.yaml`** | Ties it together and is the file CI programmatically edits to bump image tags. |

### Assumptions

- The frontend's Nginx config proxies `/api/*` to a Kubernetes Service literally named `backend` in the same namespace — this relies on K8s's built-in DNS (`backend.bazaario.svc.cluster.local`, short name works same-namespace). If you ever rename the Service, the frontend breaks silently until you also update `frontend/nginx.conf`.
- `imageTagMutability = IMMUTABLE` on ECR means you *cannot* re-push the same tag twice — every deploy needs a genuinely new tag (which is exactly what the git-SHA tagging strategy gives you).
- Health checks assume `/api/health` responds fast and doesn't depend on RDS being reachable to return 200 — check `server.js`: it does *not* check the DB connection, so a pod can report "ready" even if MySQL is unreachable. That's a real gap (see below).

### Dependencies

`ExternalSecret` → depends on External Secrets Operator being installed and its IRSA role correctly annotated → depends on `iam-irsa` module output being copied in correctly (a common manual-typo failure point, as you saw with the OIDC `sub` mismatch — same category of "the string has to match exactly" bug).

`Ingress` → depends on the ALB controller being installed and its IRSA role annotated → without it, the Ingress resource just sits with an empty `ADDRESS` forever, no error.

### Security considerations

- ⚠️ **Gap worth fixing:** `/api/health` doesn't verify DB connectivity, so Kubernetes can mark a pod "ready" while it's actually unable to serve real requests. A more honest health check would attempt a lightweight `SELECT 1` against MySQL with a short timeout.
- ⚠️ No `NetworkPolicy` resources — right now, any pod in the `bazaario` namespace (or any namespace, if none exist cluster-wide) can talk to any other pod. Fine at this scale; worth adding once you have more than one app in the cluster.
- ✅ Containers run as whatever user the base image defaults to — worth explicitly setting `runAsNonRoot: true` / `securityContext` on both Deployments for a stricter posture; currently not set.
- ✅ ECR `IMMUTABLE` tags prevent a subtle attack/mistake: nobody (including a compromised CI token) can silently swap out what `v1` points to after the fact.

### How to validate

```bash
kubectl get pods -n bazaario -o wide           # both Running, correct node, correct image digest
kubectl exec -n bazaario deploy/backend -- curl -s localhost:5000/api/health
kubectl describe ingress -n bazaario bazaario-ingress   # check Events for ALB provisioning errors
```
Full functional test (register → cart → checkout → confirm order in RDS) is still the gold-standard validation — it's the only check that proves the *entire* chain, not just one link.

---

## Phase 3: GitHub Actions CI + ArgoCD (GitOps)

### Major components

| Component | Role |
|---|---|
| **OIDC federation** (GitHub ↔ AWS IAM role) | Lets GitHub Actions get temporary AWS credentials with zero stored secrets. |
| **`ci.yml`** | Build → push to ECR → `kustomize edit set image` → commit back to git. |
| **ArgoCD `Application`** | Watches the git repo's `k8s/base` path, diffs it against the live cluster, auto-syncs. |

### Assumptions

- CI assumes the workflow always runs on `main` and that your trust policy's `sub` condition matches *exactly* what GitHub issues — you already hit the real-world version of this assumption breaking (GitHub's newer `owner@id/repo@id` claim format). Worth remembering: **any time OIDC auth fails with "not authorized," the fix is always "read the actual token claim, don't guess the string."**
- `contents: write` permission lets the workflow push commits back to your default branch directly — this assumes branch protection on `main` either doesn't exist or explicitly allows the `github-actions[bot]` identity (via an app/PAT with bypass, or no protection at all). If you add branch protection later, this step will start failing and you'll need a PAT with bypass rights or to route through a PR instead.
- ArgoCD's `selfHeal: true` assumes git is *always* correct — if you ever `kubectl edit` something as an emergency fix, ArgoCD will silently undo it within minutes unless you also fix git.

### Dependencies

`ci.yml` → OIDC provider + IAM role (Phase 1's setup, done manually, not in Terraform — worth noting as the one piece of this whole system that lives *outside* your IaC).
`ArgoCD sync` → depends on the git commit CI made actually being valid YAML/Kustomize — a malformed edit here would make ArgoCD show `Unknown`/`Degraded` with no automatic recovery.

### Security considerations

- ✅ Genuinely no static AWS keys in GitHub Secrets — this is the correct modern pattern.
- ⚠️ The GitHub Actions IAM role's permissions policy (the one covering `ecr:*`) should be scoped to just your two ECR repo ARNs, not `Resource: "*"` — worth double-checking what you actually attached versus what the guide showed as a starting point.
- ⚠️ **The IAM role trust policy is not managed by Terraform** — it was created via raw `aws iam create-role` commands. That means `terraform plan` has no visibility into it and can't detect drift. Consider bringing it into Terraform as a follow-up (a `github-oidc.tf` module) so your entire trust boundary is code-reviewed and versioned like everything else.
- ✅ ArgoCD's `prune: true` + `selfHeal: true` together mean the cluster state is *fully* determined by git — a strong security property, since it means "what's running" is always auditable via `git log`.

### How to validate

```bash
gh run list --workflow=ci.yml --limit 5      # recent runs, all green
argocd app get bazaario                        # Sync Status: Synced, Health Status: Healthy
git log --oneline -5 k8s/base/kustomization.yaml   # commits from github-actions[bot], readable history
```
The real test you already ran (trivial code change → watch it flow through all four steps automatically) is the correct end-to-end validation for this whole phase — re-run it any time you touch the pipeline.

---

## Phase 4: Monitoring + Rollback

### Major components

| Component | Role |
|---|---|
| **kube-prometheus-stack** (Prometheus + Grafana + Alertmanager) | Scrapes cluster + pod metrics, plus your backend's custom `/metrics` (via `prom-client`) through the `ServiceMonitor`. |
| **Rollback Layer 1** (`kubectl rollout undo` / `argocd app rollback`) | Manual, always available, no extra install. |
| **Rollback Layer 2** (`maxUnavailable: 0` + readiness probes) | Passive protection — bad pods just never take traffic, old pods keep serving. |
| **Rollback Layer 3** (Argo Rollouts + Prometheus `AnalysisTemplate`) | Active, automatic — canaries 25% of traffic, queries real error-rate metrics, auto-aborts if the new version is actually unhealthy. |

### Assumptions

- Layer 3's `AnalysisTemplate` PromQL query filters on `status_code=~"5.."` — this assumes your backend's error responses genuinely return 5xx for real failures (a quick audit: your `routes/*.js` files return 400/401/402/404/409 for expected client errors and 500 only for unexpected ones — this is correct and exactly what the analysis needs, but it's worth re-confirming any time you add new error handling).
- The `successCondition: result[0] < 0.05` (5% error threshold) is a starting guess, not a measured baseline — you don't yet have a real traffic history to know what "normal" looks like for this app. Treat this number as provisional until you've watched it under real usage.
- Grafana access assumes you're always tunneling through the jump server — there's no separate authentication/authorization layer on Grafana itself beyond its own admin login, so anyone who can reach that port-forward has full Grafana access (read + potentially edit, depending on the role you gave the admin account).

### Dependencies

Rollback Layer 3 → depends on Layer 1's `AnalysisTemplate` actually being able to reach `kube-prometheus-stack-prometheus.monitoring.svc:9090` — a namespace/service-name typo here fails *silently* (the rollout just never gets analysis data and can hang at the paused step).

Grafana's `additionalServiceMonitors` → depends on the backend Service having a **named** port (`http`) matching what the ServiceMonitor's `endpoints.port` expects — this was a real bug I fixed while building it; worth knowing as a category of failure (Prometheus ServiceMonitors match on port *names*, not numbers, and mismatches fail silently with just "no metrics" rather than an error).

### Security considerations

- ⚠️ Alertmanager is installed but nothing currently *routes* alerts anywhere (no Slack/email/PagerDuty receiver configured) — right now, monitoring is purely "look at a dashboard when you remember to," not "get paged." Worth adding a receiver if this needs to catch problems while you're not watching.
- ⚠️ `grafana.adminPassword` set via `--set` on the CLI means it's sitting in your shell history — for anything beyond a personal dev cluster, that credential should also flow through Secrets Manager + External Secrets rather than a CLI flag.
- ✅ Prometheus's own data isn't sensitive (metrics, not business data), so its exposure surface is lower-stakes than the app itself — but Grafana *dashboards* could reveal business-sensitive info (order volume, error rates) if ever exposed beyond the tunnel.

### How to validate

```bash
kubectl get pods -n monitoring                                    # all Running
kubectl exec -n monitoring deploy/kube-prometheus-stack-operator -- true   # operator alive
# In Grafana: confirm the http_request_duration_seconds metric has data points, not a flat empty graph
```
For rollback specifically — the only real validation is the failure-injection test described in Step 4 (deliberately push a broken build and watch the safety net catch it). **Do this now, once, deliberately, in a low-stakes moment** — the worst time to discover your rollback doesn't actually work is during a real incident.

---

## The honest summary

This is a genuinely solid architecture for what it is — a learning/portfolio-grade cloud-native deployment with real IaC, real GitOps, real observability, and layered rollback. The gaps I flagged above (health checks not checking DB connectivity, IAM trust policy living outside Terraform, no alert routing, single NAT gateway) are exactly the kind of things that separate "working" from "production-hardened," and are reasonable next steps rather than signs anything here is broken. None of them block you from using or demonstrating what you've built.
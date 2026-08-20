# 🛍️ Bazaario — Cloud-Native E-Commerce Platform on AWS

A production-style, full-stack e-commerce application deployed on **AWS EKS** with complete Infrastructure as Code, GitOps continuous delivery, and observability — built to demonstrate a real cloud-native platform end to end, not just a single service.

**Live stack:** React · Node.js/Express · MySQL · Docker · Terraform · Kubernetes (EKS) · ECR · RDS · Secrets Manager · GitHub Actions · ArgoCD · Prometheus · Grafana

---

## Architecture

![Bazaario Architecture](![alt text](image.png))

**How a change actually flows through the system, start to finish:**

1. A developer pushes code to `main` on GitHub.
2. **GitHub Actions** builds Docker images for the frontend and backend, tags each with the git SHA, and pushes them to **Amazon ECR**.
3. The same workflow commits the new image tag into `k8s/base/kustomization.yaml` — this is the GitOps handoff.
4. **ArgoCD**, running inside the EKS cluster, detects the git change and automatically syncs the cluster to match — no one runs `kubectl apply` by hand.
5. New pods pull the updated image from ECR and roll out; old pods keep serving traffic until new ones pass their readiness probe.
6. **External Secrets Operator** continuously syncs database credentials and the JWT secret from **AWS Secrets Manager** into a Kubernetes Secret the backend consumes — no secrets ever live in git or in the image.
7. The **Application Load Balancer** routes public traffic to the frontend pods (Nginx), which proxy `/api/*` requests to the backend pods (Node/Express), which talk to **RDS MySQL** over a private, security-group-restricted connection.
8. **Prometheus** scrapes both cluster metrics and the backend's custom `/metrics` endpoint; **Grafana** visualizes it.
9. A **jump server (bastion EC2)** is the only path for an engineer to reach the cluster directly (`kubectl`/`helm`) — the EKS API and RDS are not otherwise reachable from the internet.

---

## Features

**Application**
- JWT-based register/login, bcrypt password hashing
- Product catalog with search and category filters
- Cart, checkout, and order history
- Test-mode payment gateway (simulates approve/decline — no real payment provider, no real charges)
- Light/dark mode, responsive UI

**Platform / DevOps**
- Full Infrastructure as Code (Terraform, modularized — VPC, EKS, RDS, ECR, IAM, Secrets Manager, bastion)
- Containerized with Docker; multi-stage builds for a lean frontend image
- Kubernetes deployment on EKS with readiness/liveness probes and rolling updates
- CI: GitHub Actions builds, tags, and pushes images via OIDC (no static AWS keys)
- CD: ArgoCD GitOps — git is the single source of truth, with automatic drift correction
- Secrets never touch git or the image — AWS Secrets Manager + External Secrets Operator
- Observability: Prometheus + Grafana, custom application metrics via `prom-client`
- Layered rollback strategy: manual (`kubectl rollout undo`), rollout-safety (zero-downtime rolling updates), and optional automated canary analysis (Argo Rollouts)

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, JWT, bcrypt |
| Database | MySQL 8 (Amazon RDS in production, or local via Docker Compose) |
| Containers | Docker, multi-stage builds, Nginx (frontend) |
| Infrastructure | Terraform (modular), AWS VPC / EKS / EC2 / ECR / RDS / IAM / Secrets Manager |
| Orchestration | Kubernetes (EKS, EC2-backed managed node group) |
| CI/CD | GitHub Actions (OIDC to AWS) + ArgoCD (GitOps) |
| Observability | Prometheus, Grafana, `prom-client` |
| Networking | AWS Application Load Balancer via AWS Load Balancer Controller |

---

## Project structure

```
ecommerce-app/
├── backend/                    Node.js/Express API + Dockerfile
├── frontend/                   React app + Dockerfile + nginx.conf
├── docker-compose.yml          Local dev: run the full stack with one command
│
├── infra-aws/terraform/        Terraform, modularized
│   ├── main.tf, eks.tf, vpc.tf, variables.tf, outputs.tf
│   └── modules/
│       ├── jump-server/         Bastion EC2 (existing key pair)
│       ├── rds/                 MySQL, private subnet only
│       ├── secrets-manager/     DB credentials + JWT secret
│       ├── ecr/                 Backend + frontend image repos
│       └── iam-irsa/            IAM roles for ALB controller & External Secrets
│
├── k8s/
│   ├── base/                    Deployments, Services, Ingress, ExternalSecret, Kustomization
│   └── argocd/application.yaml  ArgoCD GitOps Application
│
├── .github/workflows/ci.yml    CI: build, tag, push to ECR, commit new tag
├── monitoring/prometheus-values.yaml   Helm values for kube-prometheus-stack
└── docs/architecture.png       This diagram
```

---

## Running it locally (no AWS required)

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd ecommerce-app
docker compose up --build
```
Open **http://localhost:8080**. Log in with the seeded demo account (`demo@example.com` / `password123`), or register your own. Test checkout with card `4242 4242 4242 4242` (any future expiry, any CVC) — any card works except one ending in `0002`, which simulates a decline.

---

## Deploying to AWS (EKS)

This is the full path, in order:

1. **Terraform** provisions the VPC, EKS cluster (EC2 node group), RDS, ECR, Secrets Manager, IAM roles, and the jump server.
2. **Build & push images to ECR**, wire the real image tags into `k8s/base/kustomization.yaml`.
3. **Deploy manually once** via the jump server (`kubectl apply -k k8s/base`) to prove the whole chain works — EKS → RDS → Secrets Manager → ALB.
4. **Wire up GitHub Actions CI** (OIDC role, no static keys) and **install ArgoCD** so every future push auto-deploys.
5. **Install Prometheus + Grafana** for observability, and layer in rollback protection (rolling-update safety settings at minimum; Argo Rollouts + Prometheus-driven canary analysis optionally).

Detailed, copy-pasteable, step-by-step commands for all of the above — including exact `terraform.tfvars` setup, ECR login, ALB/External-Secrets Helm installs, ArgoCD registration, and monitoring install — are broken out into focused guides so each stage is easy to follow independently:

- `infra-aws/README.md` — Terraform, ECR, and manual Kubernetes deployment
- Project root deployment guide — the same flow plus CI/CD, ArgoCD, and monitoring end to end

---

## Security highlights

- **No long-lived cloud credentials anywhere** — IAM Roles for Service Accounts (IRSA) for in-cluster AWS access, GitHub OIDC federation for CI (not static access keys).
- **RDS is not internet-reachable** — private subnet only, security group locked to the EKS node group.
- **Secrets never live in git, images, or manifests** — AWS Secrets Manager is the source of truth; External Secrets Operator syncs them into the cluster at runtime.
- **Single controlled entry point** — the jump server is the only host with SSH exposed; the EKS API and database have no other direct path in.
- **Immutable image tags** in ECR — a tag can never be silently repointed after the fact.

See the full breakdown of assumptions, dependencies, and known hardening gaps (e.g. health checks not yet verifying DB connectivity, IAM trust policy not yet in Terraform) in the architecture notes.

---

## Monitoring & rollback

- **Prometheus** scrapes cluster and pod metrics plus the backend's own `/metrics` (request latency, counts, by route).
- **Grafana** visualizes it — default Kubernetes dashboards plus custom panels on application metrics.
- **Rollback is layered, not single-point-of-failure:**
  1. Manual: `kubectl rollout undo` / `argocd app rollback`, always available.
  2. Structural: `maxUnavailable: 0` + readiness probes mean a broken deploy never fully replaces working pods.
  3. Optional automated: Argo Rollouts + a Prometheus `AnalysisTemplate` can canary a new version at 25% traffic and auto-abort if the real error rate crosses a threshold — no human required.

---

## Known limitations / next steps

- `/api/health` doesn't currently verify live DB connectivity — a pod can report "ready" without being able to serve real requests.
- The GitHub Actions OIDC IAM role is provisioned manually (`aws iam create-role`), not yet in Terraform — worth folding in for full IaC coverage.
- Single NAT gateway (cost-optimized for dev/learning) — swap to one-per-AZ for production HA.
- No alert routing configured yet (Alertmanager is installed but has no Slack/email/PagerDuty receiver).

---

## License

This project is for learning/demonstration purposes. Adapt freely.
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.24"

  cluster_name    = local.cluster_name
  cluster_version = var.eks_cluster_version

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true # dev convenience; restrict via cluster_endpoint_public_access_cidrs in prod

  # Lets IAM Roles for Service Accounts (IRSA) work for ALB controller, external-secrets, etc.
  enable_irsa = true

  # "API_AND_CONFIG_MAP" enables the modern EKS access-entry API (used below to grant
  # the jump server's IAM role kubectl access) while keeping aws-auth compatibility.
  authentication_mode = "API_AND_CONFIG_MAP"

  # Grants the jump server EC2 instance's IAM role (modules/jump-server) admin
  # access to run kubectl against this cluster. This works with no cycle because
  # the jump-server module's IAM role has zero dependency on this EKS module or
  # on RDS/Secrets Manager - see the comment in modules/jump-server/main.tf.
  access_entries = {
    jump_server = {
      principal_arn = module.jump_server.iam_role_arn
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }

  eks_managed_node_group_defaults = {
    ami_type = "AL2023_x86_64_STANDARD"
  }

  # "EKS with EC2" node group - standard managed node group backed by an ASG of EC2 instances
  eks_managed_node_groups = {
    default = {
      instance_types = var.node_instance_types
      capacity_type  = "ON_DEMAND"

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size

      labels = {
        role = "app"
      }
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Security group rule: allow the EKS node group to reach RDS on 3306 (referenced in rds.tf)

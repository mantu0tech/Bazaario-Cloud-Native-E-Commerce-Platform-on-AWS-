terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.31"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.14"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state - uncomment and fill in after creating the bucket/table once (see README-AWS.md Part 1)
  backend "s3" {
    bucket         = "bazaario-tfstate-files"
    key            = "bazaario/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs          = slice(data.aws_availability_zones.available.names, 0, 3)
  name         = "${var.project_name}-${var.environment}"
  cluster_name = "${local.name}-eks"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# --- Credentials, generated once here so both the RDS and Secrets Manager modules
# can consume the same values without needing to depend on each other. ---
resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

# --- Module call order below follows the dependency chain described in each
# module's comments: jump-server and ecr have no dependencies; eks depends on
# jump-server (IAM role ARN for its access entry); rds depends on eks (node
# security group ID); secrets-manager depends on rds (endpoint/port). ---

module "jump_server" {
  source = "./modules/jump-server"

  name                 = local.name
  aws_region           = var.aws_region
  account_id           = data.aws_caller_identity.current.account_id
  vpc_id               = module.vpc.vpc_id
  public_subnet_id     = module.vpc.public_subnets[0]
  key_pair_name        = var.jump_server_key_pair_name
  allowed_ssh_cidr     = var.jump_server_allowed_ssh_cidr
  instance_type        = var.jump_server_instance_type
  eks_cluster_name     = local.cluster_name
  eks_cluster_version  = var.eks_cluster_version
  secrets_prefix       = "${local.name}/app-secrets"
  tags                 = local.common_tags
}

module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  tags         = local.common_tags
}

module "rds" {
  source = "./modules/rds"

  name                       = local.name
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnets
  allowed_security_group_id  = module.eks.node_security_group_id
  db_name                    = var.db_name
  db_username                = var.db_username
  db_password                = random_password.db_password.result
  instance_class             = var.db_instance_class
  allocated_storage          = var.db_allocated_storage
  multi_az                   = var.db_multi_az
  tags                       = local.common_tags
}

module "secrets_manager" {
  source = "./modules/secrets-manager"

  name        = "${local.name}-app-secrets"
  db_host     = module.rds.endpoint
  db_port     = tostring(module.rds.port)
  db_name     = var.db_name
  db_username = var.db_username
  db_password = random_password.db_password.result
  jwt_secret  = random_password.jwt_secret.result
  tags        = local.common_tags
}

module "iam_irsa" {
  source = "./modules/iam-irsa"

  name                       = local.name
  oidc_provider_arn          = module.eks.oidc_provider_arn
  secrets_manager_secret_arn = module.secrets_manager.secret_arn
  tags                       = local.common_tags
}

# Root-level resource (not inside a module) so it can safely depend on both
# jump_server and rds outputs without those two modules depending on each other.
resource "aws_security_group_rule" "rds_from_jump_server" {
  type                     = "ingress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  security_group_id        = module.rds.security_group_id
  source_security_group_id = module.jump_server.security_group_id
  description               = "MySQL from jump server (debugging)"
}

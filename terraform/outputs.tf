output "aws_region" {
  value = var.aws_region
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "ecr_backend_repo_url" {
  value = module.ecr.backend_repo_url
}

output "ecr_frontend_repo_url" {
  value = module.ecr.frontend_repo_url
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "secrets_manager_secret_arn" {
  value = module.secrets_manager.secret_arn
}

output "secrets_manager_secret_name" {
  value = module.secrets_manager.secret_name
}

output "alb_controller_role_arn" {
  value = module.iam_irsa.alb_controller_role_arn
}

output "external_secrets_role_arn" {
  value = module.iam_irsa.external_secrets_role_arn
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "jump_server_public_ip" {
  value = module.jump_server.public_ip
}

output "jump_server_ssh_command" {
  value = "ssh -i /path/to/${var.jump_server_key_pair_name}.pem ec2-user@${module.jump_server.public_ip}"
}

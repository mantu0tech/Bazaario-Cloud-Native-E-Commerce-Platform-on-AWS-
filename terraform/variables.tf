variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Short name used to prefix all resources"
  type        = string
  default     = "bazaario"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.35"
}

variable "node_instance_types" {
  description = "EC2 instance types for the EKS managed node group"
  type        = list(string)
  default     = ["m7i-flex.large"]
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 4
}

variable "db_name" {
  description = "MySQL database name"
  type        = string
  default     = "bazaario"
}

variable "db_username" {
  description = "Master username for RDS MySQL"
  type        = string
  default     = "bazaario_admin"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Whether to enable Multi-AZ for RDS (set true for production)"
  type        = bool
  default     = false
}

variable "jump_server_key_pair_name" {
  description = "Name of an EXISTING EC2 key pair (created beforehand in the AWS console/CLI) used to SSH into the jump server"
  type        = string
  # no default on purpose - you must supply your own existing key pair name
}

variable "jump_server_allowed_ssh_cidr" {
  description = "CIDR allowed to SSH into the jump server. Restrict this to your own IP, e.g. \"203.0.113.10/32\" - do NOT leave this as 0.0.0.0/0 outside of quick testing."
  type        = string
  default     = "0.0.0.0/0"
}

variable "jump_server_instance_type" {
  description = "Instance type for the bastion/jump server"
  type        = string
  default     = "m7i-flex.large"
}

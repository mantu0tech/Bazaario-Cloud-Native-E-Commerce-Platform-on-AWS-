variable "name" {
  description = "Name prefix for resources (e.g. bazaario-dev)"
  type        = string
}

variable "aws_region" {
  type = string
}

variable "account_id" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_id" {
  type = string
}

variable "key_pair_name" {
  description = "Name of an EXISTING EC2 key pair"
  type        = string
}

variable "allowed_ssh_cidr" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "eks_cluster_name" {
  description = "Plain string, not a module output - keeps this module free of a dependency on the EKS module"
  type        = string
}

variable "eks_cluster_version" {
  type = string
}

variable "secrets_prefix" {
  description = "Predictable name prefix used to build the Secrets Manager ARN this box can read, without depending on the secrets module's output (avoids a module cycle)"
  type        = string
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "name" {
  type = string
}

variable "oidc_provider_arn" {
  type = string
}

variable "secrets_manager_secret_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}

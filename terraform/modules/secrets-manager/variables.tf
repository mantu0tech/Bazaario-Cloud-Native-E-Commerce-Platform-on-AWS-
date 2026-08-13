variable "name" {
  description = "Base name for the secret, e.g. bazaario-dev - the secret is stored as \"<name>/app-secrets\""
  type        = string
}

variable "db_host" {
  type = string
}

variable "db_port" {
  type = string
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "tags" {
  type    = map(string)
  default = {}
}

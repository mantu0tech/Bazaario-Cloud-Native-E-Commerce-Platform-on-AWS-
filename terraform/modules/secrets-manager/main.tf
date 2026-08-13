resource "aws_secretsmanager_secret" "this" {
  name        = "${var.name}/app-secrets"
  description = "Bazaario backend runtime secrets (DB credentials, JWT secret)"
  tags        = var.tags
}

resource "aws_secretsmanager_secret_version" "this" {
  secret_id = aws_secretsmanager_secret.this.id
  secret_string = jsonencode({
    DB_HOST     = var.db_host
    DB_PORT     = var.db_port
    DB_NAME     = var.db_name
    DB_USER     = var.db_username
    DB_PASSWORD = var.db_password
    JWT_SECRET  = var.jwt_secret
  })
}

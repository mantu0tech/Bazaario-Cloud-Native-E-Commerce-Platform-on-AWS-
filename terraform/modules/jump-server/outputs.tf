output "public_ip" {
  value = aws_instance.this.public_ip
}

output "iam_role_arn" {
  description = "Used by the EKS module's access_entries to grant this instance kubectl access"
  value       = aws_iam_role.this.arn
}

output "security_group_id" {
  value = aws_security_group.this.id
}

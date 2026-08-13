# --- Verify the key pair you supplied actually exists in this account/region ---
data "aws_key_pair" "this" {
  key_name = var.key_pair_name
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# --- IAM role - deliberately has NO dependency on the EKS/RDS/Secrets modules' outputs.
# It only needs var.account_id + var.aws_region + var.secrets_prefix (all plain strings),
# so this role can be created before, after, or in parallel with everything else. That's
# what lets the EKS module safely depend on this role's ARN (for the access entry) without
# creating jump-server -> secrets -> rds -> eks -> jump-server cycle. ---
resource "aws_iam_role" "this" {
  name = "${var.name}-jump-server"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "eks_describe" {
  name = "${var.name}-jump-server-eks-describe"
  role = aws_iam_role.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["eks:DescribeCluster", "eks:ListClusters"]
      Resource = "*"
    }]
  })
}

# Predictable ARN pattern (account_id + region + name), not an actual resource reference -
# this is what avoids the module dependency cycle described above.
resource "aws_iam_role_policy" "read_secret" {
  name = "${var.name}-jump-server-read-secret"
  role = aws_iam_role.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = "arn:aws:secretsmanager:${var.aws_region}:${var.account_id}:secret:${var.secrets_prefix}*"
    }]
  })
}

resource "aws_iam_instance_profile" "this" {
  name = "${var.name}-jump-server"
  role = aws_iam_role.this.name
}

resource "aws_security_group" "this" {
  name        = "${var.name}-jump-server-sg"
  description = "Jump server - SSH in from an allowed CIDR, unrestricted egress"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

resource "aws_instance" "this" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [aws_security_group.this.id]
  iam_instance_profile        = aws_iam_instance_profile.this.name
  key_name                    = data.aws_key_pair.this.key_name
  associate_public_ip_address = true

  # Installs aws cli v2, kubectl, helm, mysql client, and configures kubeconfig.
  # Retries update-kubeconfig for a couple of minutes in case the EKS cluster is
  # still being created in parallel with this instance (they have no hard
  # dependency on each other by design - see the module dependency note above).
  user_data = <<-EOF
    #!/bin/bash
    set -e
    dnf update -y
    dnf install -y unzip mariadb105 jq git

    curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
    unzip -q /tmp/awscliv2.zip -d /tmp
    /tmp/aws/install

    curl -sLO "https://dl.k8s.io/release/v${var.eks_cluster_version}.0/bin/linux/amd64/kubectl"
    install -m 0755 kubectl /usr/local/bin/kubectl

    curl -sL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

    for i in $(seq 1 20); do
      if sudo -u ec2-user aws eks update-kubeconfig --region ${var.aws_region} --name ${var.eks_cluster_name} 2>/tmp/kubeconfig-err.log; then
        echo "kubeconfig configured successfully" > /tmp/kubeconfig-status.log
        break
      fi
      sleep 15
    done
  EOF

  tags = merge(var.tags, { Name = "${var.name}-jump-server" })
}

data "aws_vpc" "selected" {
  state = "available"
}

data "aws_subnet" "a" {
  filter {
    name   = "tag:Name"
    values = [var.subnet_a]
  }
}

data "aws_subnet" "b" {
  filter {
    name   = "tag:Name"
    values = [var.subnet_b]
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "rds_sg"
  description = "Security group for AWS lambda and AWS RDS connection"
  vpc_id      = data.aws_vpc.selected.id
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["127.0.0.1/32"]
    self        = true
  }

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [data.aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_security_group" "app" {
  name = "App_sg"
}

# resource "aws_security_group" "ecs_sso_grafana_sg" {
#   name        = "ecs-sso-grafana-sg"
#   description = "Allow inbound access from the ALB only"
#   vpc_id      = module.network.aws_vpc.id

#   ingress {
#     description     = "Only from alb"
#     protocol        = "tcp"
#     from_port       = var.sso_grafana_container_port
#     to_port         = var.sso_grafana_container_port
#     security_groups = [data.aws_security_group.app.id]
#   }

#   egress {
#     description = "All outbound"
#     protocol    = "-1"
#     from_port   = 0
#     to_port     = 0
#     cidr_blocks = ["0.0.0.0/0"]
#   }

#   tags = var.sso_grafana_tags
# }

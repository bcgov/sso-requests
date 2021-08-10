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

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

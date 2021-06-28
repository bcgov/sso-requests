resource "aws_vpc" "rds_lambda_vpc" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "RDS Lambda VPC"
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "rds_sg"
  description = "Security group for AWS lambda and AWS RDS connection"
  vpc_id      = aws_vpc.rds_lambda_vpc.id
  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    cidr_blocks     = ["127.0.0.1/32"]
    self = true
  }

  egress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    cidr_blocks     = ["0.0.0.0/0"]
  }
}

resource "aws_subnet" "rds_lambda_subnets" {
  for_each = var.networks
  vpc_id     = aws_vpc.rds_lambda_vpc.id
  cidr_block = each.value.cidr_block
  availability_zone = "${var.region}${each.value.availability_zone}"
}

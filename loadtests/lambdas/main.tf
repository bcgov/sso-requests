data "aws_vpc" "selected" {
  state = "available"
}

data "aws_subnet" "a_test" {
  filter {
    name   = "tag:Name"
    values = [var.subnet_a]
  }
}

data "aws_subnet" "b_test" {
  filter {
    name   = "tag:Name"
    values = [var.subnet_b]
  }
}

data "aws_security_group" "rds_sg" {
  name   = "rds_sg"
  vpc_id = data.aws_vpc.selected.id
}

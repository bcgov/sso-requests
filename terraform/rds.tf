# See https://github.com/chromium58/terraform-aws-example

resource "aws_db_subnet_group" "rds_subnet" {
  name       = "main"
  subnet_ids = values(aws_subnet.rds_lambda_subnets)[*].id

  tags = {
    Name = "rds subnet group"
  }
}

resource "aws_db_instance" "PostgresqlForLambda" {
  allocated_storage    = 10
  storage_type         = "gp2"
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  name                 = var.db_name
  username             = var.db_username
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.rds_subnet.id
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  storage_encrypted = true

  # Adding a final snapshot will save a final snapshot before DB is deleted
  # final_snapshot_identifier = "someid"
  skip_final_snapshot  = true
}

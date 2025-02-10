# this modules documented outputs all need a prefix of this_
module "db" {
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "~> 9.10.0"

  name   = "aurora-db-postgres"
  engine = "aurora-postgresql"
  # Cluster in v2 is provisioned with a serverless instance.
  engine_mode = "provisioned"

  vpc_id                 = data.aws_vpc.selected.id
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  subnets                = [data.aws_subnet.a.id, data.aws_subnet.b.id]
  db_subnet_group_name   = "aurora-db-postgres"
  create_db_subnet_group = true
  create_security_group  = false

  storage_encrypted = true
  apply_immediately = true
  # 0 is used to disable enhanced monitoring
  monitoring_interval  = 0
  skip_final_snapshot  = false
  enable_http_endpoint = true

  serverlessv2_scaling_configuration = {
    max_capacity             = var.rds_max_capacity
    min_capacity             = var.rds_min_capacity
    seconds_until_auto_pause = var.rds_scale_down_time
  }

  master_username             = var.db_username
  master_password             = random_password.db_password.result
  manage_master_user_password = false
  database_name               = var.db_name
  tags = {
    "managed-by" = "terraform"
  }
}

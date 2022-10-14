# this modules documented outputs all need a prefix of this_
module "db" {
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "~> 3.0"

  name        = "aurora-db-postgres"
  engine      = "aurora-postgresql"
  engine_mode = "serverless"

  vpc_id                 = data.aws_vpc.selected.id
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  subnets                = [data.aws_subnet.a.id, data.aws_subnet.b.id]

  allowed_security_groups = [aws_security_group.rds_sg.id]

  replica_scale_enabled = false
  replica_count         = 0

  storage_encrypted = true
  apply_immediately = true
  # 0 is used to disable enhanced monitoring
  monitoring_interval = 0
  # Remove this to save a final snapshot before database is destroyed
  skip_final_snapshot  = false
  enable_http_endpoint = true

  scaling_configuration = {
    auto_pause               = true
    min_capacity             = 2
    max_capacity             = 3
    seconds_until_auto_pause = 300
    timeout_action           = "ForceApplyCapacityChange"
  }

  create_random_password = false
  username               = var.db_username
  password               = random_password.db_password.result
  database_name          = var.db_name
  tags = {
    "managed-by" = "terraform"
  }
}

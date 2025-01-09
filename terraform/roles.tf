data "aws_iam_policy" "permissions_boundary_policy" {
  name = "sso-requests-boundary"
}

# ECS task execution role data
data "aws_iam_policy_document" "ecs_task_execution_role" {
  version = "2012-10-17"
  statement {
    sid     = ""
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

data "aws_iam_policy" "grafana_read_secret" {
  count = var.install_grafana
  name  = "SSOPathfinderReadGrafanaSecret"
}

# Grafana ECS task execution role
resource "aws_iam_role" "grafana_task_execution_role" {
  count                = var.install_grafana
  name                 = "GrafanaECSTaskExecutionRole"
  assume_role_policy   = data.aws_iam_policy_document.ecs_task_execution_role.json
  permissions_boundary = data.aws_iam_policy.permissions_boundary_policy.arn

  tags = var.grafana_tags
}



# Attaching task execution and read from RDS policies to task execution role
resource "aws_iam_role_policy_attachment" "grafana" {
  role = aws_iam_role.grafana_task_execution_role[0].name
  for_each = var.install_grafana == 1 ? toset([
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    "arn:aws:iam::aws:policy/AmazonRDSReadOnlyAccess",
    data.aws_iam_policy.grafana_read_secret[0].arn # secret and policy manually created in AWS
  ]) : toset([])
  policy_arn = each.value
}

resource "aws_iam_role_policy" "grafana_task_execution_cwlogs" {
  count = var.install_grafana
  name  = "grafana-task-exec-cwlogs"
  role  = aws_iam_role.grafana_task_execution_role[0].id

  policy = <<-EOF
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Action": [
                  "logs:CreateLogGroup"
              ],
              "Resource": [
                  "arn:aws:logs:*:*:*"
              ]
          }
      ]
  }
EOF
}

resource "aws_iam_role" "grafana_container_role" {
  count                = var.install_grafana
  name                 = "grafana-container-role"
  permissions_boundary = data.aws_iam_policy.permissions_boundary_policy.arn

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF

  tags = var.grafana_tags
}

resource "aws_iam_role_policy" "grafana_cwlogs" {
  count = var.install_grafana
  name  = "grafana-cw-logs"
  role  = aws_iam_role.grafana_container_role[count.index].id

  policy = <<-EOF
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Action": [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents",
                  "logs:DescribeLogStreams"
              ],
              "Resource": [
                  "arn:aws:logs:*:*:*"
              ]
          }
      ]
  }
EOF
}

resource "aws_iam_role_policy" "grafana_container_efs_access" {
  count  = var.install_grafana
  name   = "grafana-container-efs-access"
  role   = aws_iam_role.grafana_container_role[count.index].id
  policy = <<-EOF
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Action": [
                  "elasticfilesystem:ClientMount",
                  "elasticfilesystem:ClientWrite",
                  "elasticfilesystem:ClientRootAccess"
              ],
              "Resource": "*"
          }
      ]
  }
  EOF
}

# Redis ECS task execution role
resource "aws_iam_role" "redis_task_execution_role" {
  count                = var.install_redis
  name                 = "RedisECSTaskExecutionRole"
  assume_role_policy   = data.aws_iam_policy_document.ecs_task_execution_role.json
  permissions_boundary = data.aws_iam_policy.permissions_boundary_policy.arn

  tags = var.grafana_tags
}

resource "aws_iam_role" "redis_container_role" {
  count = var.install_redis
  name  = "redis-container-role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF

  tags = var.grafana_tags
}

resource "aws_iam_role_policy" "redis_task_execution_cwlogs" {
  count = var.install_redis
  name  = "redis-task-exec-cwlogs"
  role  = aws_iam_role.redis_task_execution_role[0].id

  policy = <<-EOF
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Action": [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents",
                  "logs:DescribeLogStreams"
              ],
              "Resource": [
                  "arn:aws:logs:*:*:*"
              ]
          }
      ]
  }
EOF
}

resource "aws_iam_role_policy" "redis_cwlogs" {
  count = var.install_redis
  name  = "redis-cw-logs"
  role  = aws_iam_role.redis_container_role[count.index].id

  policy = <<-EOF
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Action": [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents",
                  "logs:DescribeLogStreams"
              ],
              "Resource": [
                  "arn:aws:logs:*:*:*"
              ]
          }
      ]
  }
EOF
}

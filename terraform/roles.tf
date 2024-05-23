# ECS task execution role data
data "aws_iam_policy_document" "ecs_sso_grafana_task_execution_role" {
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

data "aws_iam_policy" "iam_sso_grafana_read_secret_policy" {
  count = var.install_sso_css_grafana
  name  = "SSOPathfinderReadGrafanaSecret"
}

# ECS task execution role
resource "aws_iam_role" "ecs_sso_grafana_task_execution_role" {
  count              = var.install_sso_css_grafana
  name               = "SSODefaultECSTaskExecutionRole"
  assume_role_policy = data.aws_iam_policy_document.ecs_sso_grafana_task_execution_role.json

  tags = var.sso_grafana_tags
}

# Attaching task execution and read from RDS policies to task execution role
resource "aws_iam_role_policy_attachment" "ecs_sso_grafana_task_role_policy_attachment" {
  role = aws_iam_role.ecs_sso_grafana_task_execution_role[1].name
  for_each = var.install_sso_css_grafana == 1 ? toset([
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    "arn:aws:iam::aws:policy/AmazonRDSReadOnlyAccess",
    data.aws_iam_policy.iam_sso_grafana_read_secret_policy[1].arn # secret and policy manually created in AWS
  ]) : []
  policy_arn = each.value
}

resource "aws_iam_role_policy" "ecs_sso_grafana_task_execution_cwlogs" {
  count = var.install_sso_css_grafana
  name  = "ecs-sso-grafana-task-exec-cwlogs"
  role  = aws_iam_role.ecs_sso_grafana_task_execution_role[1].id

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

resource "aws_iam_role" "sso_grafana_container_role" {
  count = var.install_sso_css_grafana
  name  = "sso-grafana-container-role"

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

  tags = var.sso_grafana_tags
}

resource "aws_iam_role_policy" "sso_grafana_cwlogs" {
  count = var.install_sso_css_grafana
  name  = "sso-grafana-cw-logs"
  role  = aws_iam_role.sso_grafana_container_role[count.index].id

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

resource "aws_iam_role_policy" "sso_grafana_container_efs_access" {
  count  = var.install_sso_css_grafana
  name   = "sso-grafana-container-efs-access"
  role   = aws_iam_role.sso_grafana_container_role[count.index].id
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

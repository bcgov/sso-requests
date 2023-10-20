resource "aws_ecs_cluster" "sso_ecs_cluster" {
  name = "sso-ecs-cluster"
  tags = var.sso_grafana_tags
}

resource "aws_ecs_cluster_capacity_providers" "sso_ecs_cluster_capacity_providers" {
  cluster_name = sso_ecs_cluster.main.name

  capacity_providers = ["FARGATE_SPOT"]

  default_capacity_provider_strategy {
    weight            = 100
    capacity_provider = "FARGATE_SPOT"
  }
}

resource "aws_ecs_task_definition" "sso_grafana_task_definition" {
  count                    = var.install_sso_css_grafana
  family                   = var.sso_grafana_name
  execution_role_arn       = aws_iam_role.ecs_sso_grafana_task_execution_role.arn
  task_role_arn            = aws_iam_role.sso_grafana_container_role.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.sso_grafana_fargate_cpu
  memory                   = var.sso_grafana_fargate_memory
  tags                     = var.sso_grafana_tags
  volume {
    name = "sso-grafana-data"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.efs_sso_grafana.id
      transit_encryption = "ENABLED"
    }
  }
  container_definitions = jsonencode([
    {
      essential   = true
      name        = var.sso_grafana_container_name
      image       = var.sso_grafana_container_image
      cpu         = var.sso_grafana_fargate_cpu
      memory      = var.sso_grafana_fargate_memory
      networkMode = "awsvpc"
      portMappings = [
        {
          protocol      = "tcp"
          containerPort = var.sso_grafana_container_port
          hostPort      = var.sso_grafana_container_port
        }
      ]
      environment = [
        {
          name  = "AWS_REGION",
          value = "ca-central-1"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-create-group  = "true"
          awslogs-group         = "/ecs/${var.sso_grafana_name}"
          awslogs-region        = "ca-central-1"
          awslogs-stream-prefix = "ecs"
        }
      }
      mountPoints = [
        {
          containerPath = "/var/lib/grafana",
          sourceVolume  = "sso-grafana-data"
        }
      ]
      volumesFrom = []
      environment = [
        {
          name  = "GF_AUTH_GENERIC_OAUTH_NAME",
          value = "SSO Pathfinder Sandbox"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_ENABLED",
          value = true
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_AUTH_URL",
          value = "https://dev.sandbox.loginproxy.gov.bc.ca/auth/realms/standard/protocol/openid-connect/auth"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_API_URL",
          value = "https://dev.sandbox.loginproxy.gov.bc.ca/auth/realms/standard/protocol/openid-connect/userinfo"
        },
        {
          name  = "GF_SECURITY_ADMIN_USER",
          value = "admin"
        },
        {
          name  = "GF_AUTH_GENERIC_LOGIN_ATTRIBUTE_PATH",
          value = "preferred_username"
        },
        {
          name  = "GF_AUTH_GENERIC_ROLE_ATTRIBUTE_PATH",
          value = "contains(client_roles[*], 'grafanaadmin') && 'GrafanaAdmin' || contains(client_roles[*], 'admin') && 'Admin' || contains(client_roles[*], 'editor') && 'Editor' || 'Viewer'"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_TOKEN_URL",
          value = "https://dev.sandbox.loginproxy.gov.bc.ca/auth/realms/standard/protocol/openid-connect/token"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_SCOPES",
          value = "openid"
        },
        {
          name  = "GF_AUTH_GENERIC_EMPTY_SCOPES",
          value = false
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_USE_PKCE",
          value = true
        },
        {
          name  = "GF_AUTH_GENERIC_EMAIL_ATTRIBUTE_PATH",
          value = "email"
        },
        {
          name  = "GF_AUTH_GENERIC_NAME_ATTRIBUTE_PATH",
          value = "display_name"
        }
      ]
      secrets = [
        {
          name      = "GF_SECURITY_ADMIN_USER",
          valueFrom = "${data.aws_secretsmanager_secret_version.sso_grafana_secret.arn}:GF_SECURITY_ADMIN_USER::"
        },
        {
          name      = "GF_AUTH_GENERIC_CLIENT_ID",
          valueFrom = "${data.aws_secretsmanager_secret_version.sso_grafana_secret.arn}:GF_AUTH_GENERIC_CLIENT_ID::"
        },
        {
          name      = "GF_AUTH_GENERIC_CLIENT_SECRET",
          valueFrom = "${data.aws_secretsmanager_secret_version.sso_grafana_secret.arn}:GF_AUTH_GENERIC_CLIENT_SECRET::"
        },
      ]
    }
  ])
}

resource "aws_ecs_service" "sso_grafana_service" {
  count                             = var.install_sso_css_grafana
  name                              = var.sso_grafana_name
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.sso_grafana_task_definition[count.index].arn
  desired_count                     = var.install_sso_css_grafana
  enable_ecs_managed_tags           = true
  propagate_tags                    = "TASK_DEFINITION"
  health_check_grace_period_seconds = 60
  wait_for_steady_state             = false


  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 100
  }


  network_configuration {
    security_groups  = [data.aws_security_group.app.id]
    subnets          = module.network.aws_subnet_ids.app.ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.app.id
    container_name   = var.sso_grafana_container_name
    container_port   = var.sso_grafana_container_port
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_sso_grafana_task_role_policy_attachment]

  tags = var.sso_grafana_tags
}

data "aws_secretsmanager_secret_version" "sso_grafana_secret" {
  secret_id = "sso-grafana"
}

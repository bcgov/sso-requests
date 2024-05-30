resource "aws_ecs_cluster" "sso_ecs_cluster" {
  count = var.install_sso_css_grafana
  name  = "sso-ecs-cluster"
  tags  = var.sso_grafana_tags
}

resource "aws_ecs_cluster_capacity_providers" "sso_ecs_cluster_capacity_providers" {
  count              = var.install_sso_css_grafana
  cluster_name       = aws_ecs_cluster.sso_ecs_cluster[count.index].name
  capacity_providers = ["FARGATE_SPOT"]
  default_capacity_provider_strategy {
    weight            = 100
    capacity_provider = "FARGATE_SPOT"
  }
}

resource "aws_ecs_task_definition" "sso_grafana_task_definition" {
  count                    = var.install_sso_css_grafana
  depends_on               = [aws_apigatewayv2_api.sso_grafana_api]
  family                   = var.sso_grafana_name
  execution_role_arn       = aws_iam_role.ecs_sso_grafana_task_execution_role[0].arn
  task_role_arn            = aws_iam_role.sso_grafana_container_role[count.index].arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.sso_grafana_fargate_cpu
  memory                   = var.sso_grafana_fargate_memory
  tags                     = var.sso_grafana_tags
  volume {
    name = "sso-grafana-data"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.efs_sso_grafana[count.index].id
      transit_encryption = "ENABLED"
      authorization_config {
        iam             = "ENABLED"
        access_point_id = aws_efs_access_point.sso_grafana_efs_access_point[count.index].id
      }
    }
  }
  container_definitions = jsonencode([
    {
      essential   = true
      name        = var.sso_grafana_container_name
      image       = "${var.aws_ecr_uri}/${var.sso_grafana_container_image}"
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
          name  = "GF_AUTH_DISABLE_LOGIN_FORM",
          value = "true"
        },
        {
          name  = "GF_SERVER_DOMAIN",
          value = "${aws_apigatewayv2_api.sso_grafana_api[count.index].id}.execute-api.ca-central-1.amazonaws.com"
        },
        {
          name  = "GF_SERVER_ROOT_URL",
          value = "https://${aws_apigatewayv2_api.sso_grafana_api[count.index].id}.execute-api.ca-central-1.amazonaws.com"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_NAME",
          value = "SSO Pathfinder${var.app_env == "development" ? " Sandbox" : ""}"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_ENABLED",
          value = "true"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_AUTH_URL",
          value = "${var.keycloak_v2_prod_url}/auth/realms/standard/protocol/openid-connect/auth"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_API_URL",
          value = "${var.keycloak_v2_prod_url}/auth/realms/standard/protocol/openid-connect/userinfo"
        },
        {
          name  = "GF_SECURITY_ADMIN_USER",
          value = "admin"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_LOGIN_ATTRIBUTE_PATH",
          value = "preferred_username"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_ROLE_ATTRIBUTE_PATH",
          value = "contains(client_roles[*], 'grafanaadmin') && 'GrafanaAdmin' || contains(client_roles[*], 'admin') && 'Admin' || contains(client_roles[*], 'editor') && 'Editor' || 'Viewer'"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_TOKEN_URL",
          value = "${var.keycloak_v2_prod_url}/auth/realms/standard/protocol/openid-connect/token"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_SCOPES",
          value = "openid"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_EMPTY_SCOPES",
          value = "false"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_USE_PKCE",
          value = "true"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_EMAIL_ATTRIBUTE_PATH",
          value = "email"
        },
        {
          name  = "GF_AUTH_GENERIC_OAUTH_NAME_ATTRIBUTE_PATH",
          value = "display_name"
        },
        {
          name  = "GF_AUTH_OAUTH_ALLOW_INSECURE_EMAIL_LOOKUP",
          value = "true"
        }
      ]
      secrets = [
        {
          name      = "GF_SECURITY_ADMIN_PASSWORD",
          valueFrom = "${data.aws_secretsmanager_secret_version.sso_grafana_secret[0].arn}:GF_SECURITY_ADMIN_PASSWORD::"
        },
        {
          name      = "GF_AUTH_GENERIC_OAUTH_CLIENT_ID",
          valueFrom = "${data.aws_secretsmanager_secret_version.sso_grafana_secret[0].arn}:GF_AUTH_GENERIC_OAUTH_CLIENT_ID::"
        },
        {
          name      = "GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET",
          valueFrom = "${data.aws_secretsmanager_secret_version.sso_grafana_secret[0].arn}:GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET::"
        },
      ]
    }
  ])
}

resource "aws_ecs_service" "sso_grafana_service" {
  count                             = var.install_sso_css_grafana
  name                              = var.sso_grafana_name
  cluster                           = aws_ecs_cluster.sso_ecs_cluster[count.index].id
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
    subnets          = [data.aws_subnet.a.id, data.aws_subnet.b.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.alb_target_group_sso_grafana[count.index].id
    container_name   = var.sso_grafana_container_name
    container_port   = var.sso_grafana_container_port
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_sso_grafana_task_role_policy_attachment]

  tags = var.sso_grafana_tags
}

data "aws_secretsmanager_secret_version" "sso_grafana_secret" {
  count     = var.install_sso_css_grafana
  secret_id = "sso-grafana"
}

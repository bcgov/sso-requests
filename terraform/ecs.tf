locals {
  grafana_cpu    = (var.app_env == "production" ? 256 : 256)
  grafana_memory = (var.app_env == "production" ? 512 : 512)
  redis_cpu      = (var.app_env == "production" ? 256 : 256)
  redis_memory   = (var.app_env == "production" ? 512 : 512)
  grafana_port   = 3000
  redis_port     = 6379
}

resource "aws_ecs_cluster" "sso_ecs_cluster" {
  name = "sso-ecs-cluster"
}

resource "aws_ecs_cluster_capacity_providers" "sso_ecs_cluster_capacity_providers" {
  cluster_name       = aws_ecs_cluster.sso_ecs_cluster.name
  capacity_providers = ["FARGATE_SPOT"]
  default_capacity_provider_strategy {
    weight            = 100
    capacity_provider = "FARGATE_SPOT"
  }
}

resource "aws_ecs_task_definition" "grafana" {
  count                    = var.install_grafana
  depends_on               = [aws_apigatewayv2_api.grafana]
  family                   = "grafana"
  execution_role_arn       = aws_iam_role.grafana_task_execution_role[0].arn
  task_role_arn            = aws_iam_role.grafana_container_role[count.index].arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = local.grafana_cpu
  memory                   = local.grafana_memory
  tags                     = var.grafana_tags
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
      essential              = true
      name                   = "grafana"
      image                  = "${var.aws_ecr_uri}/bcgov-sso/grafana:10.2.2"
      cpu                    = local.grafana_cpu
      memory                 = local.grafana_memory
      readonlyRootFilesystem = true
      networkMode            = "awsvpc"
      portMappings = [
        {
          protocol      = "tcp"
          containerPort = local.grafana_port
          hostPort      = local.grafana_port
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
          awslogs-group         = "/ecs/grafana"
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
          value = "${aws_apigatewayv2_api.grafana[count.index].id}.execute-api.ca-central-1.amazonaws.com"
        },
        {
          name  = "GF_SERVER_ROOT_URL",
          value = "https://${aws_apigatewayv2_api.grafana[count.index].id}.execute-api.ca-central-1.amazonaws.com"
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
          valueFrom = "${data.aws_secretsmanager_secret_version.grafana_secret[0].arn}:GF_SECURITY_ADMIN_PASSWORD::"
        },
        {
          name      = "GF_AUTH_GENERIC_OAUTH_CLIENT_ID",
          valueFrom = "${data.aws_secretsmanager_secret_version.grafana_secret[0].arn}:GF_AUTH_GENERIC_OAUTH_CLIENT_ID::"
        },
        {
          name      = "GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET",
          valueFrom = "${data.aws_secretsmanager_secret_version.grafana_secret[0].arn}:GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET::"
        },
      ]
    }
  ])
}

resource "aws_ecs_service" "grafana" {
  count                             = var.install_grafana
  name                              = "grafana"
  cluster                           = aws_ecs_cluster.sso_ecs_cluster.id
  task_definition                   = aws_ecs_task_definition.grafana[count.index].arn
  desired_count                     = 1
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
    target_group_arn = aws_alb_target_group.grafana[count.index].id
    container_name   = "grafana"
    container_port   = local.grafana_port
  }

  depends_on = [aws_iam_role_policy_attachment.grafana]

  tags = var.grafana_tags
}

data "aws_secretsmanager_secret_version" "grafana_secret" {
  count     = var.install_grafana
  secret_id = "sso-grafana"
}

resource "aws_ecs_task_definition" "redis" {
  count                    = var.install_redis
  depends_on               = [aws_lambda_function.app]
  family                   = "redis"
  execution_role_arn       = aws_iam_role.redis_task_execution_role[0].arn
  task_role_arn            = aws_iam_role.redis_container_role[count.index].arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = local.redis_cpu
  memory                   = local.redis_memory
  tags                     = var.redis_tags
  container_definitions = jsonencode([
    {
      essential              = true
      name                   = "redis"
      image                  = "public.ecr.aws/docker/library/redis:latest"
      cpu                    = local.redis_cpu
      memory                 = local.redis_memory
      readonlyRootFilesystem = true
      networkMode            = "awsvpc"
      portMappings = [
        {
          protocol      = "tcp"
          containerPort = local.redis_port
          hostPort      = local.redis_port
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
          awslogs-group         = "/ecs/redis"
          awslogs-region        = "ca-central-1"
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "redis" {
  count                             = var.install_redis
  name                              = "redis"
  cluster                           = aws_ecs_cluster.sso_ecs_cluster.id
  task_definition                   = aws_ecs_task_definition.redis[count.index].arn
  desired_count                     = var.install_redis
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
    target_group_arn = aws_lb_target_group.redis[count.index].id
    container_name   = "redis"
    container_port   = local.redis_port
  }

  tags = var.redis_tags
}

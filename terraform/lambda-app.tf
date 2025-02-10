resource "aws_lambda_function" "app" {
  filename      = "lambda-app.zip"
  function_name = "lambda-app"
  role          = aws_iam_role.iam_for_lambda.arn
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "index.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("lambda-app.zip")

  runtime = "nodejs20.x"

  vpc_config {
    subnet_ids         = [data.aws_subnet.a.id, data.aws_subnet.b.id]
    security_group_ids = [aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      APP_URL                    = var.app_url
      API_URL                    = var.api_url
      API_AUTH_SECRET            = var.api_auth_secret
      APP_ENV                    = var.app_env
      NODE_ENV                   = "production"
      LOCAL_DEV                  = var.local_dev
      DB_HOSTNAME                = module.db.cluster_endpoint
      DB_USERNAME                = var.db_username
      DB_PASSWORD                = random_password.db_password.result
      DB_NAME                    = var.db_name
      SSO_CLIENT_ID              = var.sso_client_id
      SSO_CONFIGURATION_ENDPOINT = var.sso_configuration_endpoint
      KEYCLOAK_V2_DEV_URL        = var.keycloak_v2_dev_url
      KEYCLOAK_V2_TEST_URL       = var.keycloak_v2_test_url
      KEYCLOAK_V2_PROD_URL       = var.keycloak_v2_prod_url
      KEYCLOAK_V2_DEV_USERNAME   = var.keycloak_v2_dev_username
      KEYCLOAK_V2_DEV_PASSWORD   = var.keycloak_v2_dev_password
      KEYCLOAK_V2_TEST_USERNAME  = var.keycloak_v2_test_username
      KEYCLOAK_V2_TEST_PASSWORD  = var.keycloak_v2_test_password
      KEYCLOAK_V2_PROD_USERNAME  = var.keycloak_v2_prod_username
      KEYCLOAK_V2_PROD_PASSWORD  = var.keycloak_v2_prod_password
      REALM_REGISTRY_API         = var.realm_registry_api
      GH_ACCESS_TOKEN            = var.gh_access_token
      CHES_API_ENDPOINT          = var.ches_api_endpoint
      CHES_TOKEN_ENDPOINT        = var.ches_token_endpoint
      CHES_PASSWORD              = var.ches_password
      CHES_USERNAME              = var.ches_username
      INCLUDE_DIGITAL_CREDENTIAL = var.include_digital_credential
      GRAFANA_API_TOKEN          = var.grafana_api_token
      GRAFANA_API_URL            = var.grafana_api_url
      GOLD_IP_ADDRESS            = var.gold_ip_address
      MS_GRAPH_API_AUTHORITY     = var.ms_graph_api_authority
      MS_GRAPH_API_CLIENT_ID     = var.ms_graph_api_client_id
      MS_GRAPH_API_CLIENT_SECRET = var.ms_graph_api_client_secret

      INCLUDE_BC_SERVICES_CARD        = var.include_bc_services_card
      ALLOW_BC_SERVICES_CARD_PROD     = var.allow_bc_services_card_prod
      BCSC_INITIAL_ACCESS_TOKEN_DEV   = var.bcsc_initial_access_token_dev
      BCSC_INITIAL_ACCESS_TOKEN_TEST  = var.bcsc_initial_access_token_test
      BCSC_INITIAL_ACCESS_TOKEN_PROD  = var.bcsc_initial_access_token_prod
      BCSC_REGISTRATION_BASE_URL_DEV  = var.bcsc_registration_base_url_dev
      BCSC_REGISTRATION_BASE_URL_TEST = var.bcsc_registration_base_url_test
      BCSC_REGISTRATION_BASE_URL_PROD = var.bcsc_registration_base_url_prod
      REDIS_HOST                      = var.install_redis == 1 ? aws_lb.redis_nlb[0].dns_name : ""
    }
  }

  depends_on = [aws_lb.redis_nlb]

  timeout     = 30  # up to 900 seconds (15 minutes)
  memory_size = 240 # 128 MB to 10,240 MB, in 1-MB increments
  ephemeral_storage {
    size = 512 # Min 512 MB and the Max 10240 MB
  }

  tags = {
    "managed-by" = "terraform"
  }
}

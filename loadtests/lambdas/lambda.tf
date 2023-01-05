resource "aws_lambda_function" "app_test" {
  filename      = "lambda-app.zip"
  function_name = "lambda-app-test"
  role          = var.iam_for_lambda
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "index.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("lambda-app.zip")

  runtime = "nodejs16.x"

  vpc_config {
    subnet_ids         = [data.aws_subnet.a_test.id, data.aws_subnet.b_test.id]
    security_group_ids = [data.aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      APP_URL                        = var.app_url
      API_URL                        = "https://${aws_api_gateway_rest_api.sso_backend_test.id}.execute-api.ca-central-1.amazonaws.com/test/app"
      APP_ENV                        = var.app_env
      NODE_ENV                       = "production"
      ALLOW_SILVER                   = var.allow_silver
      ALLOW_GOLD                     = var.allow_gold
      LOCAL_DEV                      = var.local_dev
      DB_HOSTNAME                    = var.db_hostname
      DB_USERNAME                    = var.db_username
      DB_PASSWORD                    = var.db_password
      DB_NAME                        = var.db_name
      SSO_CLIENT_ID                  = var.sso_client_id
      SSO_CONFIGURATION_ENDPOINT     = var.sso_configuration_endpoint
      KEYCLOAK_DEV_URL               = var.keycloak_dev_url
      KEYCLOAK_DEV_CLIENT_ID         = var.keycloak_dev_client_id
      KEYCLOAK_DEV_CLIENT_SECRET     = var.keycloak_dev_client_secret
      KEYCLOAK_TEST_URL              = var.keycloak_test_url
      KEYCLOAK_TEST_CLIENT_ID        = var.keycloak_test_client_id
      KEYCLOAK_TEST_CLIENT_SECRET    = var.keycloak_test_client_secret
      KEYCLOAK_PROD_URL              = var.keycloak_prod_url
      KEYCLOAK_PROD_CLIENT_ID        = var.keycloak_prod_client_id
      KEYCLOAK_PROD_CLIENT_SECRET    = var.keycloak_prod_client_secret
      KEYCLOAK_V2_DEV_URL            = var.keycloak_v2_dev_url
      KEYCLOAK_V2_DEV_CLIENT_ID      = var.keycloak_v2_dev_client_id
      KEYCLOAK_V2_DEV_CLIENT_SECRET  = var.keycloak_v2_dev_client_secret
      KEYCLOAK_V2_TEST_URL           = var.keycloak_v2_test_url
      KEYCLOAK_V2_TEST_CLIENT_ID     = var.keycloak_v2_test_client_id
      KEYCLOAK_V2_TEST_CLIENT_SECRET = var.keycloak_v2_test_client_secret
      KEYCLOAK_V2_PROD_URL           = var.keycloak_v2_prod_url
      KEYCLOAK_V2_PROD_CLIENT_ID     = var.keycloak_v2_prod_client_id
      KEYCLOAK_V2_PROD_CLIENT_SECRET = var.keycloak_v2_prod_client_secret
      BCEID_WEBSERVICE_PROXY         = var.bceid_webservice_proxy
      GH_ACCESS_TOKEN                = var.gh_access_token
      GH_REPO                        = var.gh_repo
      GH_WORKFLOW_ID                 = var.gh_workflow_id
      GH_BRANCH                      = var.gh_branch
      GH_OWNER                       = var.gh_owner
      CHES_API_ENDPOINT              = var.ches_api_endpoint
      CHES_TOKEN_ENDPOINT            = var.ches_token_endpoint
      CHES_PASSWORD                  = var.ches_password
      CHES_USERNAME                  = var.ches_username
    }
  }

  timeout     = 30  # up to 900 seconds (15 minutes)
  memory_size = 240 # 128 MB to 10,240 MB, in 1-MB increments
  ephemeral_storage {
    size = 512 # Min 512 MB and the Max 10240 MB
  }

  tags = {
    "managed-by" = "terraform"
  }
}

resource "aws_lambda_function" "css_api_test" {
  filename      = "lambda-css-api.zip"
  function_name = "lambda-css-api-test"
  role          = var.iam_for_lambda
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "index.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("lambda-css-api.zip")

  runtime = "nodejs16.x"

  vpc_config {
    subnet_ids         = [data.aws_subnet.a_test.id, data.aws_subnet.b_test.id]
    security_group_ids = [data.aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      APP_URL                        = var.app_url
      API_URL                        = "https://${aws_api_gateway_rest_api.sso_backend_test.id}.execute-api.ca-central-1.amazonaws.com/test/api"
      APP_ENV                        = var.app_env
      NODE_ENV                       = "production"
      ALLOW_SILVER                   = var.allow_silver
      ALLOW_GOLD                     = var.allow_gold
      LOCAL_DEV                      = var.local_dev
      DB_HOSTNAME                    = var.db_hostname
      DB_USERNAME                    = var.db_username
      DB_PASSWORD                    = var.db_password
      DB_NAME                        = var.db_name
      SSO_CLIENT_ID                  = var.sso_client_id
      SSO_CONFIGURATION_ENDPOINT     = var.sso_configuration_endpoint
      KEYCLOAK_DEV_URL               = var.keycloak_dev_url
      KEYCLOAK_DEV_CLIENT_ID         = var.keycloak_dev_client_id
      KEYCLOAK_DEV_CLIENT_SECRET     = var.keycloak_dev_client_secret
      KEYCLOAK_TEST_URL              = var.keycloak_test_url
      KEYCLOAK_TEST_CLIENT_ID        = var.keycloak_test_client_id
      KEYCLOAK_TEST_CLIENT_SECRET    = var.keycloak_test_client_secret
      KEYCLOAK_PROD_URL              = var.keycloak_prod_url
      KEYCLOAK_PROD_CLIENT_ID        = var.keycloak_prod_client_id
      KEYCLOAK_PROD_CLIENT_SECRET    = var.keycloak_prod_client_secret
      KEYCLOAK_V2_DEV_URL            = var.keycloak_v2_dev_url
      KEYCLOAK_V2_DEV_CLIENT_ID      = var.keycloak_v2_dev_client_id
      KEYCLOAK_V2_DEV_CLIENT_SECRET  = var.keycloak_v2_dev_client_secret
      KEYCLOAK_V2_TEST_URL           = var.keycloak_v2_test_url
      KEYCLOAK_V2_TEST_CLIENT_ID     = var.keycloak_v2_test_client_id
      KEYCLOAK_V2_TEST_CLIENT_SECRET = var.keycloak_v2_test_client_secret
      KEYCLOAK_V2_PROD_URL           = var.keycloak_v2_prod_url
      KEYCLOAK_V2_PROD_CLIENT_ID     = var.keycloak_v2_prod_client_id
      KEYCLOAK_V2_PROD_CLIENT_SECRET = var.keycloak_v2_prod_client_secret
      BCEID_WEBSERVICE_PROXY         = var.bceid_webservice_proxy
      GH_ACCESS_TOKEN                = var.gh_access_token
      GH_REPO                        = var.gh_repo
      GH_WORKFLOW_ID                 = var.gh_workflow_id
      GH_BRANCH                      = var.gh_branch
      GH_OWNER                       = var.gh_owner
      CHES_API_ENDPOINT              = var.ches_api_endpoint
      CHES_TOKEN_ENDPOINT            = var.ches_token_endpoint
      CHES_PASSWORD                  = var.ches_password
      CHES_USERNAME                  = var.ches_username
    }
  }

  timeout = 30

  tags = {
    "managed-by" = "terraform"
  }
}

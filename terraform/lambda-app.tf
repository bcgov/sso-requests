resource "aws_lambda_function" "app" {
  filename      = "lambda-app.zip"
  function_name = "lambda-app"
  role          = aws_iam_role.iam_for_lambda.arn
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "app/src/main.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("lambda-app.zip")

  runtime = "nodejs12.x"

  vpc_config {
    subnet_ids         = [data.aws_subnet.a.id, data.aws_subnet.b.id]
    security_group_ids = [aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      NODE_ENV                    = "production"
      LOCAL_DEV                   = var.local_dev
      DB_HOSTNAME                 = module.db.this_rds_cluster_endpoint
      DB_USERNAME                 = var.db_username
      DB_PASSWORD                 = var.db_password
      DB_NAME                     = var.db_name
      AUD                         = var.aud
      CONFIGURATION_ENDPOINT      = var.configuration_endpoint
      KEYCLOAK_DEV_URL            = var.keycloak_dev_url
      KEYCLOAK_DEV_CLIENT_ID      = var.keycloak_dev_client_id
      KEYCLOAK_DEV_CLIENT_SECRET  = var.keycloak_dev_client_secret
      KEYCLOAK_TEST_URL           = var.keycloak_test_url
      KEYCLOAK_TEST_CLIENT_ID     = var.keycloak_test_client_id
      KEYCLOAK_TEST_CLIENT_SECRET = var.keycloak_test_client_secret
      KEYCLOAK_PROD_URL           = var.keycloak_prod_url
      KEYCLOAK_PROD_CLIENT_ID     = var.keycloak_prod_client_id
      KEYCLOAK_PROD_CLIENT_SECRET = var.keycloak_prod_client_secret
    }
  }

  timeout = 30

  tags = {
    "managed-by" = "terraform"
  }
}

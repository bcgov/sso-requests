resource "aws_lambda_function" "request_queue" {
  filename      = "lambda-request-queue.zip"
  function_name = "request-queue"
  role          = aws_iam_role.iam_for_lambda.arn
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "index.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("lambda-request-queue.zip")

  runtime = "nodejs18.x"

  vpc_config {
    subnet_ids         = [data.aws_subnet.a.id, data.aws_subnet.b.id]
    security_group_ids = [aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      NODE_ENV                       = "production"
      DB_HOSTNAME                    = module.db.this_rds_cluster_endpoint
      DB_USERNAME                    = var.db_username
      DB_PASSWORD                    = random_password.db_password.result
      DB_NAME                        = var.db_name
      KEYCLOAK_V2_DEV_URL            = var.keycloak_v2_dev_url
      KEYCLOAK_V2_DEV_CLIENT_ID      = var.keycloak_v2_dev_client_id
      KEYCLOAK_V2_DEV_CLIENT_SECRET  = var.keycloak_v2_dev_client_secret
      KEYCLOAK_V2_TEST_URL           = var.keycloak_v2_test_url
      KEYCLOAK_V2_TEST_CLIENT_ID     = var.keycloak_v2_test_client_id
      KEYCLOAK_V2_TEST_CLIENT_SECRET = var.keycloak_v2_test_client_secret
      KEYCLOAK_V2_PROD_URL           = var.keycloak_v2_prod_url
      KEYCLOAK_V2_PROD_CLIENT_ID     = var.keycloak_v2_prod_client_id
      KEYCLOAK_V2_PROD_CLIENT_SECRET = var.keycloak_v2_prod_client_secret
    }
  }

  timeout = 45

  tags = {
    "managed-by" = "terraform"
  }
}

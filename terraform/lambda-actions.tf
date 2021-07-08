resource "aws_lambda_function" "actions" {
  filename      = "lambda-actions.zip"
  function_name = "lambda-actions"
  role          = aws_iam_role.iam_for_lambda.arn
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "actions/src/main.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("lambda-actions.zip")

  runtime = "nodejs12.x"

  vpc_config {
    subnet_ids         = [data.aws_subnet.a.id, data.aws_subnet.b.id]
    security_group_ids = [aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      NODE_ENV    = "production"
      DB_HOSTNAME = module.db.this_rds_cluster_endpoint
      DB_USERNAME = var.db_username
      DB_PASSWORD = var.db_password
      DB_NAME     = var.db_name
      GH_SECRET   = var.gh_secret
    }
  }

  timeout = 30

  tags = {
    "managed-by" = "terraform"
  }
}

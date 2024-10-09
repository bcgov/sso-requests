resource "aws_lambda_function" "db" {
  filename      = "lambda-db.zip"
  function_name = "lambda-db"
  role          = aws_iam_role.iam_for_lambda.arn
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "index.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("lambda-db.zip")

  runtime = "nodejs20.x"

  vpc_config {
    subnet_ids         = [data.aws_subnet.a.id, data.aws_subnet.b.id]
    security_group_ids = [aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      NODE_ENV    = "production"
      DB_HOSTNAME = module.db.this_rds_cluster_endpoint
      DB_USERNAME = var.db_username
      DB_PASSWORD = random_password.db_password.result
      DB_NAME     = var.db_name
    }
  }

  timeout = 45

  tags = {
    "managed-by" = "terraform"
  }
}

data "aws_lambda_invocation" "db" {
  function_name = aws_lambda_function.db.function_name

  input = <<JSON
{
}
JSON
}

output "result_entry" {
  value = jsondecode(data.aws_lambda_invocation.db.result)
}

resource "aws_lambda_function" "migration" {
  filename      = "migration.zip"
  function_name = "lambda-migration"
  role          = data.aws_iam_role.iam_for_lambda.arn
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "migration/src/main.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("migration.zip")

  runtime = "nodejs12.x"

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.vpc_sg_ids
  }

  environment {
    variables = {
      NODE_ENV    = "production"
      DB_HOSTNAME = var.db_hostname
      DB_USERNAME = var.db_username
      DB_PASSWORD = var.db_password
      DB_NAME     = var.db_name
    }
  }

  timeout = 30

  tags = {
    "managed-by" = "terraform"
  }
}

data "aws_iam_role" "iam_for_lambda" {
  name = "iam_for_lambda"
}

resource "aws_iam_role_policy_attachment" "this" {
  role       = data.aws_iam_role.iam_for_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

data "aws_lambda_invocation" "migration" {
  function_name = aws_lambda_function.migration.function_name

  input = <<JSON
{
}
JSON
}

output "result_entry" {
  value = jsondecode(data.aws_lambda_invocation.migration.result)
}

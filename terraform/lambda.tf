resource "aws_iam_role" "iam_for_lambda" {
  name = "iam_for_lambda"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_lambda_function" "auth" {
  filename      = "bundle.zip"
  function_name = "handler"
  role          = aws_iam_role.iam_for_lambda.arn
  # has to have the form filename.functionname where filename is the file containing the export
  handler       = "main.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("bundle.zip")

  runtime = "nodejs12.x"

  vpc_config {
      subnet_ids = values(aws_subnet.rds_lambda_subnets)[*].id
      security_group_ids = [aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      rds_endpoint = aws_db_instance.PostgresqlForLambda.endpoint
      db_username = var.db_username
      db_password = var.db_password
      db_name = var.db_name
      aud = var.aud
      issuer = var.issuer
      jwk_url = var.jwk_url
    }
  }
}

resource "aws_iam_role_policy_attachment" "test-attach" {
    role       = aws_iam_role.iam_for_lambda.name
    policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

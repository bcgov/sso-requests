resource "aws_iam_role" "iam_for_lambda" {
  name = "iam_for_lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action : "sts:AssumeRole",
        Principal : {
          "Service" : "lambda.amazonaws.com"
        },
        Effect : "Allow",
        Sid : ""
      },
    ]
  })
}

resource "aws_lambda_function" "app" {
  filename      = "app.zip"
  function_name = "handler"
  role          = aws_iam_role.iam_for_lambda.arn
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "app/src/main.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("app.zip")

  runtime = "nodejs12.x"

  vpc_config {
    subnet_ids         = [data.aws_subnet.a.id, data.aws_subnet.b.id]
    security_group_ids = [aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      NODE_ENV               = "production"
      DB_HOSTNAME            = module.db.this_rds_cluster_endpoint
      DB_USERNAME            = var.db_username
      DB_PASSWORD            = var.db_password
      DB_NAME                = var.db_name
      AUD                    = var.aud
      CONFIGURATION_ENDPOINT = var.configuration_endpoint
    }
  }

  timeout = 30

  tags = {
    "managed-by" = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "this" {
  role       = aws_iam_role.iam_for_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_invoke" {
  role   = aws_iam_role.iam_for_lambda.id
  policy = data.aws_iam_policy_document.invoke_github.json
}

data "aws_iam_policy_document" "invoke_github" {
  statement {
    sid    = ""
    effect = "Allow"
    actions = [
      "lambda:InvokeFunction",
      "lambda:InvokeAsync"
    ]
    resources = [aws_lambda_function.github.arn]
  }
}

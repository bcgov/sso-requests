resource "aws_lambda_function" "github" {
  filename      = "lambda-github.zip"
  function_name = "lambda-github"
  role          = aws_iam_role.iam_for_lambda.arn
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "github/src/main.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("lambda-github.zip")

  runtime = "nodejs12.x"

  vpc_config {
    subnet_ids         = [data.aws_subnet.a.id, data.aws_subnet.b.id]
    security_group_ids = [aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      GH_ACCESS_TOKEN = var.gh_access_token
      GH_REPO         = var.gh_repo
      GH_WORKFLOW_ID  = var.gh_workflow_id
      GH_BRANCH       = var.gh_branch
    }
  }

  timeout = 30

  tags = {
    "managed-by" = "terraform"
  }
}

resource "aws_lambda_function" "scheduler" {
  filename      = "lambda-scheduler.zip"
  function_name = "lambda-scheduler"
  role          = aws_iam_role.iam_for_lambda.arn
  # has to have the form filename.functionname where filename is the file containing the export
  handler = "index.handler"

  # The filebase64sha256() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the base64sha256() function and the file() function:
  # source_code_hash = "${base64sha256(file("lambda_function_payload.zip"))}"
  source_code_hash = filebase64sha256("lambda-scheduler.zip")

  runtime = "nodejs16.x"

  vpc_config {
    subnet_ids         = [data.aws_subnet.a.id, data.aws_subnet.b.id]
    security_group_ids = [aws_security_group.rds_sg.id]
  }

  environment {
    variables = {
      NODE_ENV          = "production"
      GH_REPO           = var.gh_repo
      GH_BRANCH         = var.gh_branch
      GH_OWNER          = var.gh_owner
      GH_WORKFLOW_ID    = var.gh_apply_workflow_id
      GH_WORKFLOW_V2_ID = var.gh_apply_workflow_v2_id
      GH_ACCESS_TOKEN   = var.gh_access_token
    }
  }

  timeout = 45

  tags = {
    "managed-by" = "terraform"
  }
}

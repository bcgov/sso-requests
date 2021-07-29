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

resource "aws_iam_role_policy_attachment" "this" {
  role       = aws_iam_role.iam_for_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_invoke" {
  role   = aws_iam_role.iam_for_lambda.id
  policy = data.aws_iam_policy_document.invoke_github.json
}

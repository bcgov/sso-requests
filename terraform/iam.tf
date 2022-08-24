resource "aws_iam_role" "api_gateway_s3_role" {
  name = "ApiGatewayAmazonS3AccessRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action : "sts:AssumeRole",
        Principal : {
          "Service" : "apigateway.amazonaws.com"
        },
        Effect : "Allow",
        Sid : ""
      },
    ]
  })
}


resource "aws_iam_role_policy" "s3_read_access_policy" {
  name = "AWSS3ResourceReadAccessRolePolicy"
  role = aws_iam_role.api_gateway_s3_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:Get*",
          "s3:List*",
          "s3-object-lambda:Get*",
          "s3-object-lambda:List*",
        ]
        Effect = "Allow"
        Resource = [
          "${module.s3_sso_api_swagger.bucket_arn}/*",
        ]
      },
    ]
  })
}

data "aws_iam_policy_document" "s3_read_access_policy" {
  version = "2012-10-17"
  statement {
    sid    = ""
    effect = "Allow"
    actions = [
      "s3:Get*",
      "s3:List*",
      "s3-object-lambda:Get*",
      "s3-object-lambda:List*"
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role" "s3_read_access_role" {
  name               = "ApiGatewayAmazonS3ReadOnlyAccess"
  assume_role_policy = data.aws_iam_policy_document.s3_read_access_policy.json
}

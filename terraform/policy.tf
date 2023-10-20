resource "aws_iam_policy" "secrets_manager_read_policy" {
  name        = "SSOPathfinderReadGrafanaSecret"
  description = "A policy for reading secrets from secrets manager"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Effect": "Allow",
      "Resource": [
          "arn:aws:secretsmanager:ca-central-1:220881534007:secret:sso-grafana-EgZsZS"
      ]
    }
  ]
}
EOF
}

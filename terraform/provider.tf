provider "aws" {
  region = "ca-central-1"
  # assume_role {
  #   role_arn = "arn:aws:iam::${var.target_aws_account_id}:role/BCGOV_${var.target_env}_Automation_Admin_Role"
  # }
}

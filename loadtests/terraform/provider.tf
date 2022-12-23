provider "aws" {
  region = "ca-central-1"
  assume_role {
    role_arn = "arn:aws:iam::220881534007:role/BCGOV_dev_Automation_Admin_Role"
  }
}

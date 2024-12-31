provider "aws" {
  region = "ca-central-1"

  default_tags {
    tags = {
      repository = "sso-requests"
    }
  }
}

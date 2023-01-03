terraform {
  required_version = ">= 0.15.3"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.34.0"
    }

    random = {
      source  = "hashicorp/random"
      version = ">= 3.4.3"
    }
  }
}

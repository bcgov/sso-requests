variable "region" {
  type    = string
  default = "ca-central-1"
}

variable "networks" {
  description = "AWS subnets"
  type        = map(any)
  default = {
    first = {
      "cidr_block"        = "10.0.1.0/24",
      "availability_zone" = "a"
    },
    second = {
      "cidr_block"        = "10.0.2.0/24",
      "availability_zone" = "b"
    },
    third = {
      "cidr_block"        = "10.0.3.0/24",
      "availability_zone" = "d"
    }
  }
}

variable "db_username" {
  description = "The username for the DB master user"
  type        = string
  default     = "test_admin"
  sensitive   = true
}

variable "db_password" {
  description = "The password for the DB master user"
  type        = string
  default     = "test_admin"
  sensitive   = true
}

variable "db_name" {
  description = "The name of the database"
  type = string
  default = "ExampleDB"
}

variable "jwk_url" {
  description = "The jwk url for the realm you want users to authenticate to"
  type = string
  default = "https://dev.oidc.gov.bc.ca/auth/realms/onestopauth/protocol/openid-connect/certs"
}

variable "issuer" {
  description = "The required issuer for authentication"
  type = string
  default = "https://dev.oidc.gov.bc.ca/auth/realms/onestopauth"
}

variable "aud" {
  description = "The required audience for authentication"
  type = string
  default = "tmp-sso-requests"
}

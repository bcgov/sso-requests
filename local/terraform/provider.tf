terraform {
  required_version = ">= 0.15.5"
  required_providers {
    keycloak = {
      source  = "mrparkers/keycloak"
      version = "3.10.0"
    }
  }
}

provider "keycloak" {
  client_id = "admin-cli"
  username  = var.username
  password  = var.password
  url       = var.keycloak_url
}

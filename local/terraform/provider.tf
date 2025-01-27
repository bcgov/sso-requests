terraform {
  required_version = ">= 1.1.4"
  required_providers {
    keycloak = {
      source  = "keycloak/keycloak"
      version = "5.0.0"
    }
  }
}

provider "keycloak" {
  client_id = "admin-cli"
  username  = var.username
  password  = var.password
  url       = "${var.keycloak_url}/auth"
}

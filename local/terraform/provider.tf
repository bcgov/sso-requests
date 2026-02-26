terraform {
  required_version = ">= 1.11.0"
  required_providers {
    keycloak = {
      source  = "keycloak/keycloak"
      version = ">=5.4.0"
    }
  }
}

provider "keycloak" {
  client_id = "admin-cli"
  username  = var.username
  password  = var.password
  url       = "${var.keycloak_url}/auth"
}

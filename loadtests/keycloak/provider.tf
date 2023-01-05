provider "kubernetes" {
  config_path = "~/.kube/config"
}

provider "keycloak" {
  url           = "https://sso-keycloak-c6af30-dev.apps.gold.devops.gov.bc.ca"
  client_id     = "admin-cli"
  username      = var.keycloak_admin_username
  password      = var.keycloak_admin_password
  initial_login = false
}

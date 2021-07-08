variable "keycloak_dev_url" {
  description = "Keycloak url in customer dev environment"
}

variable "keycloak_test_url" {
  description = "Keycloak url in customer test environment"
}

variable "keycloak_prod_url" {
  description = "Keycloak url in customer prod environment"
}

variable "keycloak_dev_client_id" {
  description = "Keycloak service account client id in customer dev environment"
  default     = "terraform-cli"
}

variable "keycloak_test_client_id" {
  description = "Keycloak service account client id in customer test environment"
  default     = "terraform-cli"
}

variable "keycloak_prod_client_id" {
  description = "Keycloak service account client id in customer prod environment"
  default     = "terraform-cli"
}

variable "keycloak_dev_client_secret" {
  description = "Keycloak service account client secret in customer dev environment"
}

variable "keycloak_test_client_secret" {
  description = "Keycloak service account client secret in customer test environment"
}

variable "keycloak_prod_client_secret" {
  description = "Keycloak service account client secret in customer prod environment"
}

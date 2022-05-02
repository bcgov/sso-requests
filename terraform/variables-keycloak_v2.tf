variable "keycloak_v2_dev_url" {
  description = "Keycloak v2 url in customer dev environment"
}

variable "keycloak_v2_test_url" {
  description = "Keycloak v2 url in customer test environment"
}

variable "keycloak_v2_prod_url" {
  description = "Keycloak v2 url in customer prod environment"
}

variable "keycloak_v2_dev_client_id" {
  description = "Keycloak v2 service account client id in customer dev environment"
  default     = "terraform-cli"
}

variable "keycloak_v2_test_client_id" {
  description = "Keycloak v2 service account client id in customer test environment"
  default     = "terraform-cli"
}

variable "keycloak_v2_prod_client_id" {
  description = "Keycloak v2 service account client id in customer prod environment"
  default     = "terraform-cli"
}

variable "keycloak_v2_dev_client_secret" {
  description = "Keycloak v2 service account client secret in customer dev environment"
}

variable "keycloak_v2_test_client_secret" {
  description = "Keycloak v2 service account client secret in customer test environment"
}

variable "keycloak_v2_prod_client_secret" {
  description = "Keycloak v2 service account client secret in customer prod environment"
}

variable "bceid_webservice_proxy" {
  description = "BCEID Webservice proxy endpoint"
}

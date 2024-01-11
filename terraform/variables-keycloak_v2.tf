variable "keycloak_v2_dev_url" {
  type        = string
  description = "Keycloak v2 url in customer dev environment"
}

variable "keycloak_v2_test_url" {
  type        = string
  description = "Keycloak v2 url in customer test environment"
}

variable "keycloak_v2_prod_url" {
  type        = string
  description = "Keycloak v2 url in customer prod environment"
}

variable "realm_registry_api" {
  type        = string
  description = "Realm Registry API URL"
}

variable "keycloak_v2_dev_username" {
  type        = string
  description = "The username of the user used by the provider for authentication via the password grant"
  default     = ""
}

variable "keycloak_v2_dev_password" {
  type        = string
  description = "The password of the user used by the provider for authentication via the password grant"
  default     = ""
}
variable "keycloak_v2_test_username" {
  type        = string
  description = "The username of the user used by the provider for authentication via the password grant"
  default     = ""
}

variable "keycloak_v2_test_password" {
  type        = string
  description = "The password of the user used by the provider for authentication via the password grant"
  default     = ""
}
variable "keycloak_v2_prod_username" {
  type        = string
  description = "The username of the user used by the provider for authentication via the password grant"
  default     = ""
}

variable "keycloak_v2_prod_password" {
  type        = string
  description = "The password of the user used by the provider for authentication via the password grant"
  default     = ""
}

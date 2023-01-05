variable "keycloak_admin_username" {
  description = "The keycloak admin username"
  type        = string
  default     = "admin"
}

variable "keycloak_admin_password" {
  description = "The keycloak admin username"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "team_id" {
  description = "Team Id"
  type        = string
  default     = "1"
}

variable "namespace" {
  description = "Namespace"
  type        = string
  default     = "c6af30-dev"
}

variable "integration_client_id" {
  description = "Integration Client Id"
  type        = string
  default     = "integration-client-id"
}

variable "team_api_account_id" {
  description = "Team API Account Id"
  type        = string
  default     = "team-api-account-id"
}

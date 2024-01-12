variable "db_username" {
  description = "The username for the DB master user"
  type        = string
  default     = "sysadmin"
  sensitive   = true
}

variable "db_name" {
  description = "The name of the database"
  type        = string
  default     = "ssorequests"
}

variable "db_password" {
  description = "The DB password"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_hostname" {
  description = "The hostname of the database instance"
  type        = string
  default     = ""
}

variable "sso_configuration_endpoint" {
  description = "The openid configuration endpoint url"
  type        = string
  default     = "https://dev.oidc.gov.bc.ca/auth/realms/onestopauth/.well-known/openid-configuration"
}

variable "sso_client_id" {
  description = "The required audience for authentication"
  type        = string
  default     = "css-app-in-gold-4128"
  sensitive   = true
}

variable "subnet_a" {
  type        = string
  description = "Value of the name tag for the subnet in AZ a"
  default     = "App_Dev_aza_net"
}

variable "subnet_b" {
  type        = string
  description = "Value of the name tag for the subnet in AZ b"
  default     = "App_Dev_azb_net"
}

variable "gh_access_token" {
  type        = string
  description = "access token for github workflows"
  default     = ""
  sensitive   = true
}

variable "gh_owner" {
  type        = string
  description = "organization owning the github repository to create keycloak client pull requests"
  default     = "bcgov"
}

variable "gh_repo" {
  type        = string
  description = "repository to create keycloak client pull requests"
  default     = "sso-terraform-dev"
}

variable "gh_branch" {
  type        = string
  description = "default branch in the gh_repo"
  default     = "main"
}

variable "gh_workflow_id" {
  type        = string
  description = "workflow id or filename to trigger when saving requests"
  default     = "request.yml"
}

variable "gh_apply_workflow_id" {
  type        = string
  description = "workflow id or filename to trigger when Terraform Batch"
  default     = "terraform-batch.yml"
}

variable "gh_apply_workflow_v2_id" {
  type        = string
  description = "workflow id or filename to trigger when Terraform Batch"
  default     = "terraform-v2-batch.yml"
}

variable "gh_secret" {
  type        = string
  description = "secret for comms with gh actions"
  default     = "secret"
  sensitive   = true
}

variable "app_url" {
  type        = string
  description = "the frontend app base url"
  default     = "https://bcgov.github.io/sso-requests-sandbox"
}

variable "app_env" {
  type        = string
  description = "the application environment; development, test, production"
  default     = "development"
}

variable "local_dev" {
  type        = string
  description = "whether to run lambda functions in local dev environment"
  default     = "false"
}

variable "ches_password" {
  type        = string
  description = "password for ches service"
  sensitive   = true
}

variable "ches_username" {
  type        = string
  description = "username for ches service"
  sensitive   = true
}

variable "ches_api_endpoint" {
  type        = string
  description = "endpoint for ches service"
}

variable "ches_token_endpoint" {
  type        = string
  description = "endpoint for ches service"
}

variable "custom_domain_name" {
  type        = string
  description = "custom domain name for a Regional API, API Gateway"
}

variable "keycloak_v2_dev_url" {
  type        = string
  description = "Keycloak v2 url in customer dev environment"
  default     = ""
}

variable "keycloak_v2_test_url" {
  type        = string
  description = "Keycloak v2 url in customer test environment"
  default     = ""
}

variable "keycloak_v2_prod_url" {
  type        = string
  description = "Keycloak v2 url in customer prod environment"
  default     = ""
}

variable "keycloak_v2_dev_username" {
  type        = string
  description = "The username of the user used by the provider for authentication via the password grant"
  default     = ""
  sensitive   = true
}

variable "keycloak_v2_dev_password" {
  type        = string
  description = "The password of the user used by the provider for authentication via the password grant"
  default     = ""
  sensitive   = true
}
variable "keycloak_v2_test_username" {
  type        = string
  description = "The username of the user used by the provider for authentication via the password grant"
  default     = ""
  sensitive   = true
}

variable "keycloak_v2_test_password" {
  type        = string
  description = "The password of the user used by the provider for authentication via the password grant"
  default     = ""
  sensitive   = true
}
variable "keycloak_v2_prod_username" {
  type        = string
  description = "The username of the user used by the provider for authentication via the password grant"
  default     = ""
  sensitive   = true
}

variable "keycloak_v2_prod_password" {
  type        = string
  description = "The password of the user used by the provider for authentication via the password grant"
  default     = ""
  sensitive   = true
}

variable "realm_registry_api" {
  type        = string
  description = "Realm Registry API URL"
  default     = ""
}

variable "iam_for_lambda" {
  type        = string
  description = "ARN of the role iam_for_lambda"
  default     = "arn:aws:iam::1234567890:role/iam_for_lambda"
}

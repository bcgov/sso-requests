resource "random_password" "db_password" {
  length  = 16
  special = false
}

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

variable "sso_configuration_endpoint" {
  description = "The openid configuration endpoint url"
  type        = string
  default     = "https://dev.oidc.gov.bc.ca/auth/realms/onestopauth/.well-known/openid-configuration"
}

variable "sso_client_id" {
  description = "The required audience for authentication"
  type        = string
  default     = "sso-requests"
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
  default     = "https://bcgov.github.io/sso-requests-dev"
}

variable "api_url" {
  type        = string
  description = "the api base url"
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

variable "allow_silver" {
  type        = string
  description = "whether to run lambda functions in local dev environment"
  default     = "true"
}

variable "allow_gold" {
  type        = string
  description = "whether to run lambda functions in local dev environment"
  default     = "true"
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

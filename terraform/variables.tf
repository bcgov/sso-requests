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

variable "include_digital_credential" {
  description = "Whether to include digital credential as an IDP option"
  type        = string
  default     = "false"
}

variable "grafana_api_token" {
  description = "API token for the grafana service account."
  type        = string
  sensitive   = true
}

variable "grafana_api_url" {
  description = "Base url to call the grafana api"
  type        = string
}

variable "ms_graph_api_authority" {
  description = "API authority for microsoft azure idir lookup"
  type        = string
  sensitive   = true
}

variable "ms_graph_api_client_id" {
  description = "Client ID for microsoft azure idir lookup"
  type        = string
  sensitive   = true
}

variable "ms_graph_api_client_secret" {
  description = "Client secret for microsoft azure idir lookup"
  type        = string
  sensitive   = true
}


variable "sso_client_id" {
  description = "The required audience for authentication"
  type        = string
  default     = "css-app-in-gold-4128"
  sensitive   = true
}

variable "subnet_a" {
  type        = string
  description = "Value of the name tag for the app subnet in AZ a"
  default     = "App_Dev_aza_net"
}

variable "subnet_b" {
  type        = string
  description = "Value of the name tag for the app subnet in AZ b"
  default     = "App_Dev_azb_net"
}

variable "subnet_data_a" {
  type        = string
  description = "Value of the name tag for the data subnet in AZ a"
  default     = "Data_Dev_aza_net"
}

variable "subnet_data_b" {
  type        = string
  description = "Value of the name tag for the data subnet in AZ b"
  default     = "Data_Dev_azb_net"
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

variable "api_url" {
  type        = string
  description = "the api base url"
}

variable "api_auth_secret" {
  type        = string
  description = "the api authorization secret"
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

variable "uptime_status_domain_name" {
  type        = string
  description = "custom domain name for the uptime status page"
}

variable "gold_ip_address" {
  type        = string
  description = "IP address of service running in gold cluster"
  default     = "142.34.229.4"
}

variable "rc_webhook" {
  type        = string
  description = "The Rocket.Chat webhook for sso-ops channel"
  default     = ""
  sensitive   = true
}

variable "include_bc_services_card" {
  type    = string
  default = false
}

variable "allow_bc_services_card_prod" {
  type    = string
  default = false
}

variable "bcsc_initial_access_token_dev" {
  type      = string
  sensitive = true
}

variable "bcsc_initial_access_token_test" {
  type      = string
  sensitive = true
}

variable "bcsc_initial_access_token_prod" {
  type      = string
  sensitive = true
}

variable "bcsc_registration_base_url_dev" {
  type      = string
  sensitive = true
}

variable "bcsc_registration_base_url_test" {
  type      = string
  sensitive = true
}

variable "bcsc_registration_base_url_prod" {
  type      = string
  sensitive = true
}


variable "rds_scale_down_time" {
  type        = number
  description = "time in seconds of inactivity to scale down the RDS database"
  default     = 60
}

variable "rds_max_capacity" {
  type        = number
  description = "Maximum number of ACUs to scale up to"
  default     = 2
}

variable "rds_min_capacity" {
  type        = number
  description = "Minimum number of ACUs to scale down to."
  default     = 0
}

variable "request_queue_rate" {
  type        = string
  description = "Rate to run the request queue."
  # See https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule#argument-reference for formatting options.
  default = "rate(5 minutes)"
}

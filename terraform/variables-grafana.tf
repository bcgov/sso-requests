variable "install_sso_css_grafana" {
  type        = number
  description = "Do you need to install Grafana?"
  default     = 1
}

variable "sso_grafana_tags" {
  type        = map(string)
  description = "Tags for Grafana"
  default = {
    Application = "sso-grafana"
  }
}

variable "sso_grafana_name" {
  description = "The name of the application"
  type        = string
  default     = "sso-grafana"
}

variable "sso_grafana_health_check_path" {
  description = "The path for the health check endpoint"
  type        = string
  default     = "/api/health"
}

variable "sso_grafana_fargate_cpu" {
  description = "The CPU units for the Fargate task"
  type        = number
  default     = 1024
}

variable "sso_grafana_fargate_memory" {
  description = "The memory for the Fargate task"
  type        = number
  default     = 2048
}

variable "sso_grafana_container_name" {
  description = "The name of the container"
  type        = string
  default     = "grafana"
}

variable "sso_grafana_container_image" {
  description = "The container image url"
  type        = string
  default     = "bcgov-sso/grafana:9.3.2"
}

variable "sso_grafana_container_port" {
  description = "The container port"
  type        = number
  default     = 3000
}

variable "aws_ecr_uri" {
  description = "The ECR URI"
  type        = string
  default     = ""
}

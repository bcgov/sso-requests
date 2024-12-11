variable "install_grafana" {
  type        = number
  description = "Do you need to install Grafana?"
  default     = 1
}

variable "install_redis" {
  type        = number
  description = "Do you need to install Redis?"
  default     = 1
}

variable "grafana_tags" {
  type        = map(string)
  description = "Tags for Grafana"
  default = {
    Application = "grafana"
  }
}

variable "redis_tags" {
  type        = map(string)
  description = "Tags for Redis"
  default = {
    Application = "redis"
  }
}

variable "aws_ecr_uri" {
  description = "The ECR URI"
  type        = string
  default     = ""
}

terraform {
  required_version = ">= 0.15.3"

  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.1.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.9.0"
    }
    keycloak = {
      source  = "mrparkers/keycloak"
      version = "3.10.0"
    }
  }
}

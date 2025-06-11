locals {
  standard_realm_name                   = "standard"
  idir_realm_name                       = "idir"
  azureidir_realm_name                  = "azureidir"
  bceidbasic_realm_name                 = "bceidbasic"
  bceidbusiness_realm_name              = "bceidbusiness"
  bceidboth_realm_name                  = "bceidboth"
  github_realm_name                     = "github"
  digitalcredential_realm_name          = "digitalcredential"
  otp_realm_name                        = "otp"
  sandbox_client_redirect_uri           = ""
  siteminder_single_sign_on_service_url = ""
}

module "standard" {
  source       = "github.com/bcgov/sso-terraform-modules?ref=dev/modules/base-realms/realm-standard"
  keycloak_url = var.keycloak_url

  standard_realm_name      = local.standard_realm_name
  idir_realm_name          = local.idir_realm_name
  azureidir_realm_name     = local.azureidir_realm_name
  bceidbasic_realm_name    = local.bceidbasic_realm_name
  bceidbusiness_realm_name = local.bceidbusiness_realm_name
  bceidboth_realm_name     = local.bceidboth_realm_name
  github_realm_name        = local.github_realm_name
  otp_realm_name           = local.otp_realm_name

  idir_client_id                      = ""
  idir_client_secret                  = ""
  azureidir_client_id                 = ""
  azureidir_client_secret             = ""
  bceidbasic_client_id                = ""
  bceidbasic_client_secret            = ""
  bceidbusiness_client_id             = ""
  bceidbusiness_client_secret         = ""
  bceidboth_client_id                 = ""
  bceidboth_client_secret             = ""
  github_client_id                    = ""
  github_client_secret                = ""
  digitalcredential_client_id         = ""
  digitalcredential_client_secret     = ""
  digitalcredential_authorization_url = ""
  digitalcredential_token_url         = ""

  otp_client_id     = ""
  otp_client_secret = ""
}

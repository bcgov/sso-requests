data "keycloak_realm" "master_realm" {
  realm = "master"
}

data "keycloak_role" "realm_admin" {
  realm_id = data.keycloak_realm.master_realm.id
  name     = "admin"
}

resource "keycloak_realm" "standard_realm" {
  realm             = "standard"
  enabled           = true
  display_name      = "standard"
  display_name_html = "<b>standard</b>"
}


resource "keycloak_openid_client" "standard_integration" {
  realm_id  = keycloak_realm.standard_realm.id
  client_id = var.integration_client_id

  name    = var.integration_client_id
  enabled = true

  access_type           = "PUBLIC"
  standard_flow_enabled = true
  valid_redirect_uris   = ["*"]
}

resource "keycloak_openid_client" "standard_service_account" {
  realm_id  = keycloak_realm.standard_realm.id
  client_id = var.team_api_account_id

  name    = var.team_api_account_id
  enabled = true

  access_type              = "CONFIDENTIAL"
  service_accounts_enabled = true
}

resource "keycloak_generic_client_protocol_mapper" "saml_hardcode_attribute_mapper" {
  realm_id        = keycloak_realm.standard_realm.id
  client_id       = keycloak_openid_client.standard_service_account.id
  name            = "team"
  protocol        = "openid-connect"
  protocol_mapper = "oidc-hardcoded-claim-mapper"
  config = {
    "access.token.claim" : "true"
    "access.tokenResponse.claim" : "false"
    "claim.name" : "team"
    "claim.value" : var.team_id
    "id.token.claim" : "true"
    "userinfo.token.claim" : "true"
  }
}

resource "keycloak_openid_client" "tf_cli_service_account" {
  realm_id  = data.keycloak_realm.master_realm.id
  client_id = "terraform-cli"

  name    = "terraform-cli"
  enabled = true

  access_type              = "CONFIDENTIAL"
  service_accounts_enabled = true
}

resource "keycloak_openid_client_service_account_realm_role" "tf_cli_service_account_admin_role" {
  realm_id                = data.keycloak_realm.master_realm.id
  service_account_user_id = keycloak_openid_client.tf_cli_service_account.service_account_user_id
  role                    = data.keycloak_role.realm_admin.name
}

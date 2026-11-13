# Local login for the CSS app itself, used by the Playwright e2e suite (and handy for local development).
#
# Instead of brokering to the real Azure IDIR, users live directly in the local `standard` realm and the client
# emits the claims the app expects from an IDIR login (see app/utils/authenticate.ts):
#   identity_provider=azureidir, idir_user_guid, email, given/family_name, client_roles, aud=<client id>.
# Mappers live on the client so this file only depends on the realm existing, not on the rest of the module.
# Direct access grants are enabled so tests can fetch API tokens without driving the browser.

locals {
  e2e_client_id     = "css-app-e2e"
  e2e_app_url       = "http://localhost:3000"
  e2e_user_password = "password"

  e2e_users = {
    "e2e-user" = {
      email      = "e2e.user@gov.bc.ca"
      first_name = "E2E"
      last_name  = "User"
      guid       = "e2e00000000000000000000000000001"
      roles      = ["user"]
    }
    # Second regular user, for tests that need two people. Its email is what the mocked IDIR lookup returns
    # (MOCK_IDIR_LOOKUP_EMAIL in docker-compose.e2e.yml), so it's the one user the "add team member" UI can find.
    "e2e-additional-user" = {
      email      = "e2e.additional-user@gov.bc.ca"
      first_name = "E2E"
      last_name  = "Additional User"
      guid       = "e2e00000000000000000000000000004"
      roles      = ["user"]
    }
    "e2e-admin" = {
      email      = "e2e.admin@gov.bc.ca"
      first_name = "E2E"
      last_name  = "Admin"
      guid       = "e2e00000000000000000000000000003"
      roles      = ["user", "sso-admin"]
    }
  }
}

resource "keycloak_openid_client" "css_app_e2e" {
  realm_id  = module.standard.realm_id
  client_id = local.e2e_client_id
  name      = "CSS App (local e2e)"
  enabled   = true

  access_type                  = "PUBLIC"
  standard_flow_enabled        = true
  direct_access_grants_enabled = true
  full_scope_allowed           = false

  valid_redirect_uris             = ["${local.e2e_app_url}/*"]
  valid_post_logout_redirect_uris = ["${local.e2e_app_url}/*"]
  web_origins                     = ["+"]

  # The realm's bcgov-idp-stopper theme only renders IdP tiles; the stock theme gives a username/password form.
  login_theme = "keycloak"

}

resource "keycloak_openid_client_default_scopes" "css_app_e2e" {
  realm_id       = module.standard.realm_id
  client_id      = keycloak_openid_client.css_app_e2e.id
  default_scopes = ["basic", "profile", "email"]
}

resource "keycloak_openid_hardcoded_claim_protocol_mapper" "css_app_e2e_idp" {
  realm_id            = module.standard.realm_id
  client_id           = keycloak_openid_client.css_app_e2e.id
  name                = "identity_provider"
  claim_name          = "identity_provider"
  claim_value         = "azureidir"
  claim_value_type    = "String"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

resource "keycloak_openid_user_attribute_protocol_mapper" "css_app_e2e_guid" {
  realm_id            = module.standard.realm_id
  client_id           = keycloak_openid_client.css_app_e2e.id
  name                = "idir_user_guid"
  user_attribute      = "idir_user_guid"
  claim_name          = "idir_user_guid"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

resource "keycloak_openid_user_client_role_protocol_mapper" "css_app_e2e_roles" {
  realm_id                    = module.standard.realm_id
  client_id                   = keycloak_openid_client.css_app_e2e.id
  name                        = "client_roles"
  claim_name                  = "client_roles"
  client_id_for_role_mappings = keycloak_openid_client.css_app_e2e.client_id
  multivalued                 = true
  add_to_id_token             = true
  add_to_access_token         = true
  add_to_userinfo             = true
}

resource "keycloak_openid_audience_protocol_mapper" "css_app_e2e_aud" {
  realm_id                 = module.standard.realm_id
  client_id                = keycloak_openid_client.css_app_e2e.id
  name                     = "audience"
  included_client_audience = keycloak_openid_client.css_app_e2e.client_id
  add_to_id_token          = true
  add_to_access_token      = true
}

resource "keycloak_role" "css_app_e2e" {
  for_each  = toset(["user", "sso-admin"])
  realm_id  = module.standard.realm_id
  client_id = keycloak_openid_client.css_app_e2e.id
  name      = each.key
}

resource "keycloak_user" "e2e" {
  for_each       = local.e2e_users
  realm_id       = module.standard.realm_id
  username       = each.key
  enabled        = true
  email          = each.value.email
  email_verified = true
  first_name     = each.value.first_name
  last_name      = each.value.last_name

  attributes = {
    idir_user_guid = each.value.guid
    idir_username  = upper(each.key)
    display_name   = "${each.value.first_name} ${each.value.last_name}"
  }

  initial_password {
    value     = local.e2e_user_password
    temporary = false
  }

}

resource "keycloak_user_roles" "e2e" {
  for_each = local.e2e_users
  realm_id = module.standard.realm_id
  user_id  = keycloak_user.e2e[each.key].id
  role_ids = [for r in each.value.roles : keycloak_role.css_app_e2e[r].id]
}

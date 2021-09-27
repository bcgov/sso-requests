import requests
import json
import os

well_known_endpoint = os.environ.get('WELL_KNOWN_ENDPOINT')

class Jwk:
  def refresh_jwk(self):
    oidc_response = requests.get(well_known_endpoint)
    jwks_uri = json.loads(oidc_response.text)['jwks_uri']
    self.jwks_uri = jwks_uri
    certs_response = requests.get(jwks_uri)
    jwks = json.loads(certs_response.text)
    self.jwks = jwks
  def __init__(self):
    self.refresh_jwk()
  def authenticate(self, token):
    import jwt
    from jwt import PyJWKClient
    jwks_client = jwt.PyJWKClient(self.jwks_uri)
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    data = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience="sso-test-2-2",
        options={"verify_exp": True},
    )
    return data

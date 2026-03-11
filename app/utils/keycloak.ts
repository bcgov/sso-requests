import Keycloak from 'keycloak-js';

const sso_url = process.env.NEXT_PUBLIC_SSO_URL || '';
const sso_client_id = process.env.NEXT_PUBLIC_SSO_CLIENT_ID || '';

const keycloak = new Keycloak({
  url: sso_url,
  realm: 'standard',
  clientId: sso_client_id,
});

keycloak.onAuthRefreshError = () => keycloak.logout();

export default keycloak;

import getConfig from 'next/config';
import Keycloak from 'keycloak-js';

const { publicRuntimeConfig = {} } = getConfig() ?? {};
const { sso_client_id, sso_url } = publicRuntimeConfig;

const keycloak = new Keycloak({
  url: sso_url,
  realm: 'standard',
  clientId: sso_client_id,
});

keycloak.onAuthRefreshError = () => keycloak.logout();

keycloak.onTokenExpired = () => console.log('expired?');
export default keycloak;

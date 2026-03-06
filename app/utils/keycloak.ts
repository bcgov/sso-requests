import Keycloak from 'keycloak-js';
import { fetchConfig } from './runtimeConfigStore';

let keycloakInstance: Keycloak | null = null;

export async function getKeycloak(): Promise<Keycloak> {
  if (keycloakInstance) return keycloakInstance; // return cached instance

  const { sso_url, sso_client_id } = await fetchConfig();

  keycloakInstance = new Keycloak({
    url: sso_url,
    realm: 'standard',
    clientId: sso_client_id,
  });

  keycloakInstance.onAuthRefreshError = () => keycloakInstance!.logout();

  return keycloakInstance;
}

// Call this if you ever need to reset (e.g. logout, testing)
export function resetKeycloak() {
  keycloakInstance = null;
}

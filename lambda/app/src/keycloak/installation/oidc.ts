import RealmRepresentation from 'keycloak-admin/lib/defs/realmRepresentation';
import ClientRepresentation from 'keycloak-admin/lib/defs/clientRepresentation';
import KeycloakAdminClient from 'keycloak-admin/lib/client';
import { getAdminClient, getClient } from '../adminClient';

export const updateClientSecret = async (data: {
  serviceType: string;
  environment: string;
  realmName: string;
  clientId: string;
}) => {
  const { serviceType, environment, clientId, realmName } = data;
  const { kcAdminClient } = await getAdminClient({ serviceType, environment });

  kcAdminClient.setConfig({ realmName: realmName || 'standard' });
  const { realm, client } = await getClient(kcAdminClient, { serviceType, realmName, clientId });
  if (!client) throw Error('client not found');

  await kcAdminClient.clients.generateNewClientSecret({ id: client.id });
};

export const generateInstallation = async (data: {
  kcAdminClient: KeycloakAdminClient.KeycloakAdminClient;
  realm: RealmRepresentation;
  client: ClientRepresentation;
  authServerUrl: string;
}) => {
  const { kcAdminClient, realm, client, authServerUrl } = data;

  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L54
  const rep = { 'confidential-port': 0 };

  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L55
  rep['auth-server-url'] = authServerUrl;

  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L56
  rep['realm'] = realm.realm;

  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L57
  rep['ssl-required'] = realm.sslRequired.toLowerCase();

  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L59
  if (client.publicClient && !client.bearerOnly) {
    rep['public-client'] = true;
  }

  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L60
  if (client.bearerOnly) {
    rep['bearer-only'] = true;
  }

  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L61
  // Omit "use-resource-role-mappings"

  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L63
  rep['resource'] = client.clientId;

  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L65
  if (showClientCredentialsAdapterConfig(client)) {
    const credentials = await getClientCredentialsAdapterConfig(client, realm, kcAdminClient);
    if (typeof credentials['secret'] === 'object') rep['credentials'] = { secret: credentials.secret.value };
    else rep['credentials'] = credentials;
  }

  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L70
  // Omit "verify-token-audience"

  return rep;
};

// see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/protocol/oidc/installation/KeycloakOIDCClientInstallation.java#L92
function showClientCredentialsAdapterConfig(client) {
  if (client.publicClient) {
    return false;
  }

  if (client.bearerOnly && !client.serviceAccountsEnabled && client.nodeReRegistrationTimeout <= 0) {
    return false;
  }

  return true;
}

// see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/authentication/authenticators/client/ClientIdAndSecretAuthenticator.java#L51
// see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/authentication/authenticators/client/JWTClientAuthenticator.java#L67
// see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/authentication/authenticators/client/JWTClientSecretAuthenticator.java#L63
// see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/authentication/authenticators/client/X509ClientAuthenticator.java#L30
const authenticators = {
  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/authentication/authenticators/client/ClientIdAndSecretAuthenticator.java#L176
  'client-secret': async (client, realm, kcAdminClient) => {
    return { secret: await kcAdminClient.clients.getClientSecret({ realm: realm.realm, id: client.id }) };
  },
  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/authentication/authenticators/client/JWTClientAuthenticator.java#L241
  'client-jwt': async (client) => {
    return {
      jwt: {
        'client-keystore-file': 'REPLACE WITH THE LOCATION OF YOUR KEYSTORE FILE',
        'client-keystore-type': 'jks',
        'client-keystore-password': 'REPLACE WITH THE KEYSTORE PASSWORD',
        'client-key-password': 'REPLACE WITH THE KEY PASSWORD IN KEYSTORE',
        'client-key-alias': client.id,
        'token-timeout': 10,
      },
    };
  },
  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/authentication/authenticators/client/JWTClientSecretAuthenticator.java#L204
  'client-secret-jwt': async (client, realm, kcAdminClient) => {
    return {
      'secret-jwt': { secret: await kcAdminClient.clients.getClientSecret({ realm: realm.realm, id: client.id }) },
    };
  },
  // see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/authentication/authenticators/client/X509ClientAuthenticator.java#L153
  'client-x509': async () => {
    return {};
  },
};

// see https://github.com/keycloak/keycloak/blob/dce163d3e204115933df794772e4d49a4abf701f/services/src/main/java/org/keycloak/services/managers/ClientManager.java#L363
function getClientCredentialsAdapterConfig(client, realm, kcAdminClient) {
  const authenticator = authenticators[client.clientAuthenticatorType];
  if (!authenticator) return null;
  return authenticator(client, realm, kcAdminClient);
}

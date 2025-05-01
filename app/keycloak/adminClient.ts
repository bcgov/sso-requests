import KcAdminClient from '@keycloak/keycloak-admin-client';
import dns from 'dns';
import createHttpError from 'http-errors';

import getConfig from 'next/config';

const { serverRuntimeConfig = {}, publicRuntimeConfig = {} } = getConfig() || {};
const {
  keycloak_v2_dev_url,
  keycloak_v2_dev_username,
  keycloak_v2_dev_password,
  keycloak_v2_test_url,
  keycloak_v2_test_username,
  keycloak_v2_test_password,
  keycloak_v2_prod_url,
  keycloak_v2_prod_username,
  keycloak_v2_prod_password,
  gold_ip_address,
} = serverRuntimeConfig;

const { app_env } = publicRuntimeConfig;

export const getAdminClient = async (data: { serviceType: string; environment: string }) => {
  const { environment } = data;

  let keycloakUrl;
  let keycloakUsername;
  let keycloakPassword;

  if (environment === 'dev') {
    keycloakUrl = keycloak_v2_dev_url;
    keycloakUsername = keycloak_v2_dev_username;
    keycloakPassword = keycloak_v2_dev_password;
  } else if (environment === 'test') {
    keycloakUrl = keycloak_v2_test_url;
    keycloakUsername = keycloak_v2_test_username;
    keycloakPassword = keycloak_v2_test_password;
  } else if (environment === 'prod') {
    keycloakUrl = keycloak_v2_prod_url;
    keycloakUsername = keycloak_v2_prod_username;
    keycloakPassword = keycloak_v2_prod_password;
  } else {
    throw new createHttpError.BadRequest('invalid environment');
  }

  if (['development', 'production'].includes(app_env)) {
    const keycloakHostname = keycloakUrl.replace('https://', '');
    const ip = await dns.promises.lookup(keycloakHostname);
    if (ip.address !== gold_ip_address) {
      throw new createHttpError.UnprocessableEntity(
        `keycloak is not operational in the gold ${environment} environment, therefore resource updates will not be processed.`,
      );
    }
  }

  const authServerUrl = `${keycloakUrl}/auth`;
  const kcAdminClient = new KcAdminClient({
    baseUrl: authServerUrl,
    realmName: 'master',
  });

  await kcAdminClient.auth({
    grantType: 'password',
    clientId: 'admin-cli',
    username: keycloakUsername,
    password: keycloakPassword,
  });

  return { kcAdminClient, authServerUrl };
};

export const getClient = async (
  kcAdminClient: KcAdminClient,
  { serviceType, realmName, clientId }: { serviceType: string; realmName: string; clientId: string },
) => {
  if (serviceType === 'gold') realmName = 'standard';

  const realm = await kcAdminClient.realms.findOne({ realm: realmName });
  const clients = await kcAdminClient.clients.find({ realm: realm?.realm, clientId, max: 1 });
  const client = clients.length > 0 ? clients[0] : null;

  return { realm, client };
};

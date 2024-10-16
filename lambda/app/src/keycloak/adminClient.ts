import KcAdminClient from '@keycloak/keycloak-admin-client';
import dns from 'dns';
import createHttpError from 'http-errors';

export const getAdminClient = async (data: { serviceType: string; environment: string }) => {
  const { environment } = data;

  let keycloakUrl;
  let keycloakUsername;
  let keycloakPassword;

  if (environment === 'dev') {
    keycloakUrl = process.env.KEYCLOAK_V2_DEV_URL;
    keycloakUsername = process.env.KEYCLOAK_V2_DEV_USERNAME;
    keycloakPassword = process.env.KEYCLOAK_V2_DEV_PASSWORD;
  } else if (environment === 'test') {
    keycloakUrl = process.env.KEYCLOAK_V2_TEST_URL;
    keycloakUsername = process.env.KEYCLOAK_V2_TEST_USERNAME;
    keycloakPassword = process.env.KEYCLOAK_V2_TEST_PASSWORD;
  } else if (environment === 'prod') {
    keycloakUrl = process.env.KEYCLOAK_V2_PROD_URL;
    keycloakUsername = process.env.KEYCLOAK_V2_PROD_USERNAME;
    keycloakPassword = process.env.KEYCLOAK_V2_PROD_PASSWORD;
  } else {
    throw new createHttpError.BadRequest('invalid environment');
  }

  if (['development', 'production'].includes(process.env.APP_ENV)) {
    const keycloakHostname = keycloakUrl.replace('https://', '');
    const ip = await dns.promises.lookup(keycloakHostname);
    if (ip.address !== process.env.GOLD_IP_ADDRESS) {
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
  const clients = await kcAdminClient.clients.find({ realm: realm.realm, clientId, max: 1 });
  const client = clients.length > 0 ? clients[0] : null;

  return { realm, client };
};

import KcAdminClient from 'keycloak-admin';

export const getAdminClient = async (data: { serviceType: string; environment: string }) => {
  const { environment } = data;

  let keycloakUrl;
  let keycloakClientId;
  let keycloakClientSecret;

  if (data.serviceType === 'gold') {
    if (environment === 'dev') {
      keycloakUrl = process.env.KEYCLOAK_V2_DEV_URL;
      keycloakClientId = process.env.KEYCLOAK_V2_DEV_CLIENT_ID || 'terraform-cli';
      keycloakClientSecret = process.env.KEYCLOAK_V2_DEV_CLIENT_SECRET;
    } else if (environment === 'test') {
      keycloakUrl = process.env.KEYCLOAK_V2_TEST_URL;
      keycloakClientId = process.env.KEYCLOAK_V2_TEST_CLIENT_ID || 'terraform-cli';
      keycloakClientSecret = process.env.KEYCLOAK_V2_TEST_CLIENT_SECRET;
    } else if (environment === 'prod') {
      keycloakUrl = process.env.KEYCLOAK_V2_PROD_URL;
      keycloakClientId = process.env.KEYCLOAK_V2_PROD_CLIENT_ID || 'terraform-cli';
      keycloakClientSecret = process.env.KEYCLOAK_V2_PROD_CLIENT_SECRET;
    } else {
      throw Error('invalid environment');
    }
  } else {
    if (environment === 'dev') {
      keycloakUrl = process.env.KEYCLOAK_DEV_URL;
      keycloakClientId = process.env.KEYCLOAK_DEV_CLIENT_ID || 'terraform-cli';
      keycloakClientSecret = process.env.KEYCLOAK_DEV_CLIENT_SECRET;
    } else if (environment === 'test') {
      keycloakUrl = process.env.KEYCLOAK_TEST_URL;
      keycloakClientId = process.env.KEYCLOAK_TEST_CLIENT_ID || 'terraform-cli';
      keycloakClientSecret = process.env.KEYCLOAK_TEST_CLIENT_SECRET;
    } else if (environment === 'prod') {
      keycloakUrl = process.env.KEYCLOAK_PROD_URL;
      keycloakClientId = process.env.KEYCLOAK_PROD_CLIENT_ID || 'terraform-cli';
      keycloakClientSecret = process.env.KEYCLOAK_PROD_CLIENT_SECRET;
    } else {
      throw Error('invalid environment');
    }
  }

  const authServerUrl = `${keycloakUrl}/auth`;
  const kcAdminClient = new KcAdminClient({
    baseUrl: authServerUrl,
    realmName: 'master',
  });

  await kcAdminClient.auth({
    grantType: 'client_credentials',
    clientId: keycloakClientId,
    clientSecret: keycloakClientSecret,
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

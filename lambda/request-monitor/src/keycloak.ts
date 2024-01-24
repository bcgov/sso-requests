import KcAdminClient from 'keycloak-admin';

export const getKcAdminClient = async (environment: string) => {
  let keycloakUrl: string;
  let keycloakUsername: string;
  let keycloakPassword: string;

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
    throw Error('invalid environment');
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

export const getKeycloakClientsByEnv = async (environment: string) => {
  const clientList = [];
  const { kcAdminClient } = await getKcAdminClient(environment);
  const max = 100;
  let first = 0;

  while (true) {
    const result = await kcAdminClient.clients.find({ realm: 'standard', max, first });
    if (result.length === 0) {
      break;
    }
    clientList.push(...result);
    first = first + max;
  }
  return clientList;
};

import KcAdminClient from 'keycloak-admin';

export const getAdminClient = async (data: { environment: string }) => {
  const { environment } = data;

  let keycloakUrl;
  let keycloakClientId;
  let keycloakClientSecret;

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

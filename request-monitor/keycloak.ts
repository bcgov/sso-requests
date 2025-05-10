import createHttpError from 'http-errors';
import axios from 'axios';

export const getKeycloakConfig = (environment: string) => {
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
    throw new createHttpError.BadRequest('invalid environment');
  }
  if (!keycloakUrl || !keycloakUsername || !keycloakPassword) {
    throw new createHttpError.InternalServerError('Keycloak config is not set');
  }
  return {
    keycloakUrl,
    keycloakUsername,
    keycloakPassword,
  };
};

export const getToken = async (environment: string) => {
  try {
    const { keycloakUrl, keycloakUsername, keycloakPassword } = getKeycloakConfig(environment);
    const tokenResponse = await axios.post(
      `${keycloakUrl}/auth/realms/master/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: 'admin-cli',
        username: keycloakUsername,
        password: keycloakPassword,
        grant_type: 'password',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      },
    );
    return tokenResponse;
  } catch (err) {
    console.error('Failed to get Keycloak token', err);
    throw new createHttpError.InternalServerError('Failed to get Keycloak token');
  }
};

export const getKeycloakClientsByEnv = async (environment: string) => {
  try {
    const clientList = [];
    let token = await getToken(environment);
    const max = 100;
    let first = 0;
    const keycloakUrl = getKeycloakConfig(environment).keycloakUrl;

    if (!keycloakUrl) {
      throw new createHttpError.InternalServerError('Keycloak URL is not set');
    }

    while (true) {
      const result = await axios.get(`${keycloakUrl}/auth/admin/realms/standard/clients?max=${max}&first=${first}`, {
        headers: {
          Authorization: `Bearer ${token.data.access_token}`,
          Accept: 'application/json',
        },
      });

      //if token is about to expire, get a new one
      if (token.data.expires_in < 60) {
        token = await getToken(environment);
      }
      if (result.status !== 200) {
        throw new createHttpError.InternalServerError(`Unable to get Keycloak clients for ${environment} environment`);
      }

      if (result.data.length === 0) {
        break;
      }
      clientList.push(...result.data);
      first = first + max;
    }
    return clientList;
  } catch (err) {
    console.error('Failed get Keycloak clients', err);
  }
};

import { createIdirUser } from '../keycloak/users';
import { ConfidentialClientApplication, IConfidentialClientApplication } from '@azure/msal-node';
import { CYPRESS_MOCKED_IDIR_LOOKUP, MS_GRAPH_URL } from '@lambda-app/utils/constants';
import axios from 'axios';

let msalInstance: IConfidentialClientApplication;

const msalConfig = {
  auth: {
    authority: process.env.MS_GRAPH_API_AUTHORITY || '',
    clientId: process.env.MS_GRAPH_API_CLIENT_ID || '',
    clientSecret: process.env.MS_GRAPH_API_CLIENT_SECRET || '',
  },
};

export async function getAzureAccessToken() {
  const request = {
    scopes: [`${MS_GRAPH_URL}/.default`],
  };

  try {
    if (!msalInstance) {
      msalInstance = new ConfidentialClientApplication(msalConfig);
    }

    const response = await msalInstance.acquireTokenByClientCredential(request);
    return response?.accessToken;
  } catch (error) {
    console.error(error);
    throw new Error('Error acquiring access token');
  }
}

/**
 * Search idir users by email via the azure graph api
 * @param endpoint - The url to hit
 * @returns
 */
export async function callAzureGraphApi(endpoint: string) {
  const accessToken = await getAzureAccessToken();
  const options = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ConsistencyLevel: 'eventual',
    },
  };
  try {
    const response = await axios.get(endpoint, options);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
}

export const fuzzySearchIdirEmail = async (email: string) => {
  if (process.env.CYPRESS_RUNNER) {
    return CYPRESS_MOCKED_IDIR_LOOKUP;
  }
  const url = `${MS_GRAPH_URL}/v1.0/users?$filter=startswith(mail,'${email}')&$orderby=userPrincipalName&$count=true&$top=25`;
  return callAzureGraphApi(url).then((res) => res.value?.map((value) => ({ mail: value.mail, id: value.id })));
};

/**Search IDIR users using the bceid service by a general field and value */
export const searchIdirUsers = async (bearerToken: string, { field, search }: { field: string; search: string }) => {
  const results = await axios
    .post(
      `${process.env.REALM_REGISTRY_API}/bceid-service/idir`,
      { field, search },
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      },
    )
    .then((res: any) => res.data);

  return results;
};

export const importIdirUser = async (bearerToken: string, { guid, userId }: { guid: string; userId: string }) => {
  const results = await axios
    .post(
      `${process.env.REALM_REGISTRY_API}/bceid-service/idir`,
      { field: 'userId', search: userId },
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      },
    )
    .then((res: any) => res.data);

  if (!results || results.length === 0) return false;
  const result = results.find((user) => user.guid === guid);
  if (!result) return false;

  await Promise.all(
    ['dev', 'test', 'prod'].map((env) =>
      createIdirUser({
        environment: env,
        guid: result.guid,
        userId: result.userId,
        email: result.contact.email,
        firstName: result.individualIdentity.name.firstname,
        lastName: result.individualIdentity.name.surname,
        displayName: result.displayName,
      }).catch(() => null),
    ),
  );

  return true;
};

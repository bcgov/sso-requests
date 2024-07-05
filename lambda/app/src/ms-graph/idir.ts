import { createIdirUser } from '../keycloak/users';
import { ConfidentialClientApplication, IConfidentialClientApplication } from '@azure/msal-node';
import { CYPRESS_MOCKED_IDIR_LOOKUP, MS_GRAPH_URL } from '@lambda-app/utils/constants';
import { MsGraphUserResponse, MsGraphUserValue } from '@lambda-shared/interfaces';
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
 */
export async function callAzureGraphApi(endpoint: string) {
  const accessToken = await getAzureAccessToken();
  const options = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ConsistencyLevel: 'eventual',
    },
  };
  const response = await axios.get(endpoint, options);
  return response.data;
}

/** Search for an idir email address. Lookup uses the "startswith" function so expects the beggining of the address. */
export const searchIdirEmail = async (email: string) => {
  if (process.env.CYPRESS_RUNNER) {
    return CYPRESS_MOCKED_IDIR_LOOKUP;
  }
  const url = `${MS_GRAPH_URL}/v1.0/users?$filter=startswith(mail,'${email}')&$orderby=userPrincipalName&$count=true&$top=25`;
  return callAzureGraphApi(url).then((res) => res.value?.map((value) => ({ mail: value.mail, id: value.id })));
};

/** Validate the provided email is linked to an existing IDIR account. */
export const validateIdirEmail = async (email: string) => {
  const url = `${MS_GRAPH_URL}/v1.0/users/${email}`;
  try {
    const response = await callAzureGraphApi(url);
    return { given_name: response.givenName, family_name: response.surname };
  } catch (error) {
    return false;
  }
};

const formatUser = (data: MsGraphUserValue) => {
  const userId = data.mailNickname;
  const guid = data.onPremisesExtensionAttributes.extensionAttribute12;
  const email = data.mail;
  const firstName = data.givenName;
  const lastName = data.surname;
  const displayName = data.displayName;
  const company = data.companyName;
  const phone = data.mobilePhone;
  const department = data.department;
  const jobTitle = data.jobTitle;
  return { guid, userId, email, firstName, lastName, displayName, company, phone, department, jobTitle };
};

/** Search for an IDIR user by any field and value. Search expects the actual value to start with the provided value. */
export const searchIdirUsers = async ({ field, search }: { field: string; search: string }) => {
  const url = `${MS_GRAPH_URL}/v1.0/users?$filter=startswith(${field},'${search}')&$top=25&$select=onPremisesExtensionAttributes,mailNickname,displayName,mail,givenName,surname,companyName,department,jobTitle,mobilePhone`;
  try {
    const response = (await callAzureGraphApi(url)) as MsGraphUserResponse;
    const formattedUsers = response.value.map(formatUser);
    return formattedUsers;
  } catch (err) {
    console.log(err?.response?.data || err);
    return false;
  }
};

/** Import a user into the keycloak instances for all envs. */
export const importIdirUser = async ({ guid, userId }: { guid: string; userId: string }) => {
  const url = `${MS_GRAPH_URL}/v1.0/users?$filter=mailNickname eq '${userId}'&$select=onPremisesExtensionAttributes,displayName,mail,givenName,surname`;
  const response = (await callAzureGraphApi(url)) as MsGraphUserResponse;
  if (!response?.value?.length) {
    return false;
  }
  const result = response.value.find((user) => user.onPremisesExtensionAttributes.extensionAttribute12 === guid);
  if (!result) return false;

  await Promise.all(
    ['dev', 'test', 'prod'].map((env) =>
      createIdirUser({
        environment: env,
        guid,
        userId,
        email: result.mail,
        firstName: result.givenName,
        lastName: result.surname,
        displayName: result.displayName,
      }).catch(() => null),
    ),
  );

  return true;
};

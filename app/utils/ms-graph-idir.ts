import { createAzureIdirUser } from '../keycloak/users';
import { ConfidentialClientApplication, IConfidentialClientApplication } from '@azure/msal-node';
import { CYPRESS_MOCKED_IDIR_LOOKUP, MS_GRAPH_URL } from '@app/utils/constants';
import { MsGraphUserResponse, MsGraphUserValue } from '@app/shared/interfaces';
import axios from 'axios';
import createHttpError from 'http-errors';

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
    throw new createHttpError.Unauthorized('could not fetch access token');
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
  return callAzureGraphApi(url).then((res) => res.value?.map((value: any) => ({ mail: value.mail, id: value.id })));
};

/** Validate the provided email is linked to an existing IDIR account. */
export const validateIdirEmail = async (email: string) => {
  const url = `${MS_GRAPH_URL}/v1.0/users/${email}`;
  try {
    const response = await callAzureGraphApi(url);
    return { given_name: response.givenName, family_name: response.surname };
  } catch (error) {
    console.error('Failed to validate IDIR email via Graph API:', error);
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
  const userPrincipalName = data.userPrincipalName;
  return {
    guid,
    userId,
    email,
    firstName,
    lastName,
    displayName,
    company,
    phone,
    department,
    jobTitle,
    userPrincipalName,
  };
};

/** Search for an IDIR user by any field and value. Search expects the actual value to start with the provided value. */
export const searchIdirUsers = async ({ field, search }: { field: string; search: string }) => {
  if (!['givenName', 'surname', 'mail', 'mailNickname'].includes(field)) {
    throw new Error('Allowed search fields are givenName, surname, mail, mailNickname');
  }
  try {
    const url = `${MS_GRAPH_URL}/v1.0/users?$filter=startswith(${field},'${search}')&$top=50&$select=onPremisesExtensionAttributes,mailNickname,displayName,mail,givenName,surname,companyName,department,jobTitle,mobilePhone,userPrincipalName`;
    const response = (await callAzureGraphApi(url)) as MsGraphUserResponse;
    const formattedUsers = response.value.map(formatUser);
    return formattedUsers;
  } catch (err) {
    console.error('Failed searching Azure IDIR users from Graph API:', err);
    throw new createHttpError.UnprocessableEntity('Failed to search Azure IDIR users');
  }
};

/** Import a user into the keycloak instances for all envs. */
export const importIdirUser = async ({ guid, userId }: { guid: string; userId: string }) => {
  if (!guid || !userId) {
    throw new Error('Missing required user data');
  }

  try {
    const url = `${MS_GRAPH_URL}/v1.0/users?$filter=mailNickname eq '${userId}'&$select=onPremisesExtensionAttributes,displayName,mail,givenName,surname,userPrincipalName`;
    const response = (await callAzureGraphApi(url)) as MsGraphUserResponse;

    if (!response?.value?.length) {
      return false;
    }
    const result = response.value.find((user) => user.onPremisesExtensionAttributes.extensionAttribute12 === guid);
    if (!result) return false;

    await Promise.all(
      ['dev', 'test', 'prod'].map((env) =>
        createAzureIdirUser({
          environment: env,
          guid,
          userId,
          email: result.mail,
          firstName: result.givenName,
          lastName: result.surname,
          displayName: result.displayName,
          upn: result.userPrincipalName,
        }).catch(() => null),
      ),
    );
  } catch (err) {
    console.error('Failed to import Azure IDIR user from Graph API:', err);
    throw new createHttpError.UnprocessableEntity('Failed to import Azure IDIR user');
  }
};

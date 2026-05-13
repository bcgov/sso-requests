import { ConfidentialClientApplication, IConfidentialClientApplication } from '@azure/msal-node';
import { MS_GRAPH_URL } from './constants';
import createHttpError from 'http-errors';
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
    throw new createHttpError.Unauthorized('could not fetch access token');
  }
}

/**
 * Search idir users by email via the azure graph api
 */
export async function callAzureGraphApi(endpoint: string) {
  const accessToken = await getAzureAccessToken();
  const graphBaseUrl = new URL(MS_GRAPH_URL);
  const requestUrl = new URL(endpoint, graphBaseUrl);

  if (
    requestUrl.protocol !== graphBaseUrl.protocol ||
    requestUrl.host !== graphBaseUrl.host ||
    !requestUrl.pathname.startsWith('/v1.0/')
  ) {
    throw new createHttpError.BadRequest('Invalid Graph API endpoint');
  }

  const options = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ConsistencyLevel: 'eventual',
    },
  };
  const response = await axios.get(requestUrl.toString(), options);
  return response.data;
}

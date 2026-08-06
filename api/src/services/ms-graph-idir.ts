import { ConfidentialClientApplication, IConfidentialClientApplication } from '@azure/msal-node';
import axios from 'axios';
import { injectable } from 'tsyringe';
import logger from '@/logger';

const MS_GRAPH_URL = process.env.MS_GRAPH_URL || 'https://graph.microsoft.com';

let msalInstance: IConfidentialClientApplication;

const msalConfig = {
  auth: {
    authority: process.env.MS_GRAPH_API_AUTHORITY || '',
    clientId: process.env.MS_GRAPH_API_CLIENT_ID || '',
    clientSecret: process.env.MS_GRAPH_API_CLIENT_SECRET || '',
  },
};

async function getAzureAccessToken() {
  const request = { scopes: [`${MS_GRAPH_URL}/.default`] };
  if (!msalInstance) {
    msalInstance = new ConfidentialClientApplication(msalConfig);
  }
  const response = await msalInstance.acquireTokenByClientCredential(request);
  return response?.accessToken;
}

async function callAzureGraphApi(endpoint: string) {
  const accessToken = await getAzureAccessToken();
  const requestUrl = new URL(endpoint, MS_GRAPH_URL);
  const response = await axios.get(requestUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ConsistencyLevel: 'eventual',
    },
  });
  return response.data;
}

export interface AzureIdirAccount {
  guid: string;
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  userPrincipalName?: string;
}

@injectable()
export class MsGraphService {
  /**
   * Verifies that the given GUID (stored on the `onPremisesExtensionAttributes.extensionAttribute12`
   * attribute) resolves to a real, existing Azure IDIR account. Returns the matched user, or null
   * if no account was found.
   */
  public async verifyAzureIdirAccountByGuid(guid: string): Promise<AzureIdirAccount | null> {
    try {
      const url = `${MS_GRAPH_URL}/v1.0/users?$filter=onPremisesExtensionAttributes/extensionAttribute12 eq '${guid}'&$count=true&$select=onPremisesExtensionAttributes,mailNickname,displayName,mail,givenName,surname,userPrincipalName`;
      const response = await callAzureGraphApi(url);
      const match = response?.value?.find(
        (user: any) => user.onPremisesExtensionAttributes?.extensionAttribute12?.toLowerCase() === guid.toLowerCase(),
      );
      if (!match) return null;

      return {
        guid: match.onPremisesExtensionAttributes.extensionAttribute12,
        userId: match.mailNickname,
        email: match.mail,
        firstName: match.givenName,
        lastName: match.surname,
        displayName: match.displayName,
        userPrincipalName: match.userPrincipalName,
      };
    } catch (err) {
      logger.error('Failed to verify Azure IDIR account with the MS Graph API:', err);
      return null;
    }
  }
}

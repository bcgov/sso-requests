import { models } from '../../../shared/sequelize/models/models';
import axios from 'axios';
import { IntegrationData } from '@lambda-shared/interfaces';
import { getBCSCEnvVars } from '@lambda-app/utils/helpers';

export interface BCSCClientParameters {
  id?: number;
  clientId?: string;
  clientName?: string;
  clientUri?: string;
  clientSecret?: string;
  /** Provide scope as a space-separated string, e.g "openid address profile" */
  contacts?: string[];
  tokenEndpointAuthMethod?: string;
  idTokenSignedResponseAlg?: string;
  userinfoSignedResponseAlg?: string;
  created?: boolean;
  registrationAccessToken?: string;
  environment?: string;
}

export const createBCSCClient = async (data: BCSCClientParameters, integration: IntegrationData, userId: number) => {
  const contact = await models.user.findOne({
    where: {
      id: userId,
    },
  });

  const { bcscBaseUrl, kcBaseUrl, accessToken } = getBCSCEnvVars(data.environment);
  const jwksUri = `${kcBaseUrl}/realms/standard/protocol/openid-connect/certs`;

  const result = await axios.post(
    `${bcscBaseUrl}/oauth2/register`,
    {
      client_name: `${data.clientName}-${data.environment}`,
      // TODO: I think we will need a form field for the landing page per env
      client_uri: 'https://example.com',
      redirect_uris: [`${kcBaseUrl}/auth/realms/standard/broker/${integration.clientId}/endpoint`],
      scope: 'openid profile email address',
      contacts: [contact.idirEmail || ''],
      token_endpoint_auth_method: 'client_secret_post',
      id_token_signed_response_alg: 'RS256',
      userinfo_signed_response_alg: 'RS256',
      claims: integration.bcscAttributes,
      privacy_zone_uri: integration.bcscPrivacyZone,
      jwks_uri: jwksUri,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return result;
};

export const updateBCSCClient = async (bcscClient: BCSCClientParameters, integration: IntegrationData) => {
  const result = await axios.put(
    `${process.env.BCSC_REGISTRATION_BASE_URL}/oauth2/register/${integration.clientId}`,
    {
      client_name: `${bcscClient.clientName}-${bcscClient.environment}`,
      client_uri: bcscClient.clientUri,
      redirect_uris: [process.env.BCSC_IDP_REDIRECT_URI_DEV],
      contacts: bcscClient.contacts,
      token_endpoint_auth_method: bcscClient.tokenEndpointAuthMethod,
      id_token_signed_response_alg: bcscClient.idTokenSignedResponseAlg,
      userinfo_signed_response_alg: bcscClient.userinfoSignedResponseAlg,
      claims: integration.bcscAttributes,
      privacy_zone_uri: integration.bcscPrivacyZone,
      client_id: integration.clientId,
      registration_access_token: bcscClient.registrationAccessToken,
    },
    {
      headers: {
        Authorization: `Bearer ${bcscClient.registrationAccessToken}`,
      },
    },
  );
  return result;
};

export const deleteBCSCClient = async (data: { clientId: string; registrationToken: string; environment: string }) => {
  const { bcscBaseUrl } = getBCSCEnvVars(data.environment);
  const result = await axios.delete(`${bcscBaseUrl}/oauth2/register/${data.clientId}`, {
    headers: {
      Authorization: `Bearer ${data.registrationToken}`,
    },
  });
  return result;
};

import { models } from '../../../shared/sequelize/models/models';
import axios from 'axios';
import { IntegrationData } from '@lambda-shared/interfaces';
import { getBCSCEnvVars, getRequiredBCSCScopes } from '@lambda-app/utils/helpers';
import { getAllEmailsOfTeam } from '@lambda-app/queries/team';
import { getPrivacyZones } from '@lambda-app/controllers/bc-services-card';

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

const getBCSCContacts = async (integration: IntegrationData) => {
  let contacts = [];
  if (integration.usesTeam) {
    const teamEmails = await getAllEmailsOfTeam(Number(integration.teamId));
    contacts = teamEmails.map((member) => member?.idir_email);
  } else {
    const contact = await models.user.findOne({
      where: {
        id: integration.userId,
      },
    });
    contacts.push(contact?.idirEmail);
  }
  return contacts;
};

const getPrivacyZoneURI = async (env: string, privacyZoneDisplayName: string) => {
  const uriData = await getPrivacyZones(env);
  const privacyZone = uriData.find((zone) => zone.privacy_zone_name === privacyZoneDisplayName);
  return privacyZone?.privacy_zone_uri;
};

export const createBCSCClient = async (data: BCSCClientParameters, integration: IntegrationData, userId: number) => {
  const contacts = await getBCSCContacts(integration);
  const { bcscBaseUrl, kcBaseUrl, accessToken } = getBCSCEnvVars(data.environment);
  const jwksUri = `${kcBaseUrl}/auth/realms/standard/protocol/openid-connect/certs`;
  const requiredScopes = await getRequiredBCSCScopes(integration.bcscAttributes);
  let bcscPrivacyZoneURI = await getPrivacyZoneURI(data.environment, integration.bcscPrivacyZone);

  const result = await axios.post(
    `${bcscBaseUrl}/oauth2/register`,
    {
      client_name: data.clientName,
      client_uri: integration[`${data.environment}HomePageUri`],
      redirect_uris: [`${kcBaseUrl}/auth/realms/standard/broker/${integration.clientId}/endpoint`],
      scope: requiredScopes.join(' '),
      contacts: contacts,
      token_endpoint_auth_method: 'client_secret_post',
      id_token_signed_response_alg: 'RS256',
      userinfo_signed_response_alg: 'RS256',
      // Sub must be requested. Otherwise id token will have a randomized identifier.
      claims: [...integration.bcscAttributes, 'sub'],
      privacy_zone_uri: bcscPrivacyZoneURI,
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
  const { kcBaseUrl, bcscBaseUrl } = getBCSCEnvVars(bcscClient.environment);
  const contacts = await getBCSCContacts(integration);
  const jwksUri = `${kcBaseUrl}/auth/realms/standard/protocol/openid-connect/certs`;
  const requiredScopes = await getRequiredBCSCScopes(integration.bcscAttributes);

  const result = await axios.put(
    `${bcscBaseUrl}/oauth2/register/${bcscClient.clientId}`,
    {
      client_name: bcscClient.clientName,
      client_uri: integration[`${bcscClient.environment}HomePageUri`],
      redirect_uris: [`${kcBaseUrl}/auth/realms/standard/broker/${integration.clientId}/endpoint`],
      scope: requiredScopes.join(' '),
      contacts,
      token_endpoint_auth_method: 'client_secret_post',
      id_token_signed_response_alg: 'RS256',
      userinfo_signed_response_alg: 'RS256',
      claims: [...integration.bcscAttributes, 'sub'],
      jwks_uri: jwksUri,
      client_id: bcscClient.clientId,
      registration_access_token: bcscClient.registrationAccessToken,
      privacy_zone_uri: await getPrivacyZoneURI(bcscClient.environment, integration.bcscPrivacyZone),
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

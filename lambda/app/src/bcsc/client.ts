import { models } from '../../../shared/sequelize/models/models';
import axios from 'axios';

export interface BCSCClientParameters {
  id?: number;
  clientId: string;
  clientName: string;
  clientUri: string;
  clientSecret: string;
  /** Provide scope as a space-separated string, e.g "openid address profile" */
  scope: string;
  contacts: string[];
  tokenEndpointAuthMethod: string;
  idTokenSignedResponseAlg: string;
  userinfoSignedResponseAlg: string;
  claims: string[];
  created: boolean;
}

export const createBCSCClient = async (data: BCSCClientParameters, idirUserId: string) => {
  const contact = await models.user.findOne({
    where: {
      id: idirUserId,
    },
  });

  const result = await axios.post(
    `${process.env.BCSC_REGISTRATION_BASE_URL}/oauth2/register`,
    {
      client_name: data.clientName,
      // TODO: How the heck to get this part? redirect uris? I think it is the client app
      client_uri: 'http://localhost:3000',
      redirect_uris: [process.env.BCSC_IDP_REDIRECT_URI],
      scope: 'openid profile email address',
      contacts: [contact.idirEmail || ''],
      token_endpoint_auth_method: 'client_secret_post',
      id_token_signed_response_alg: 'RS256',
      userinfo_signed_response_alg: 'RS256',
      claims: data.claims,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.BCSC_INITIAL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return result;
};

export const updateBCSCClient = async (
  data: BCSCClientParameters & {
    clientId: string;
    registrationToken: string;
  },
) => {
  const result = await axios.put(
    `${process.env.BCSC_REGISTRATION_BASE_URL}/oauth2/register/${data.clientId}`,
    {
      client_name: data.clientName,
      client_uri: data.clientUri,
      redirect_uris: [process.env.BCSC_IDP_REDIRECT_URI],
      scope: data.scope,
      contacts: data.contacts,
      token_endpoint_auth_method: data.tokenEndpointAuthMethod,
      id_token_signed_response_alg: data.idTokenSignedResponseAlg,
      userinfo_signed_response_alg: data.userinfoSignedResponseAlg,
      claims: data.claims,
      client_id: data.clientId,
      registration_access_token: data.registrationToken,
    },
    {
      headers: {
        Authorization: `Bearer ${data.registrationToken}`,
      },
    },
  );
  return result;
};

export const deleteBCSCClient = async (data: { clientId: string; registrationToken: string }) => {
  const result = await axios.delete(`${process.env.BCSC_REGISTRATION_BASE_URL}/oauth2/register/${data.clientId}`, {
    headers: {
      Authorization: `Bearer ${data.registrationToken}`,
    },
  });
  return result;
};

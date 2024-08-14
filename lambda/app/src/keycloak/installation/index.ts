import { getAdminClient, getClient } from '../adminClient';
import { updateClientSecret as oidcUpdateClientSecret, generateInstallation as oidcGenerateInstallation } from './oidc';
import { generateInstallation as samlGenerateInstallation } from './saml';

export const generateInstallation = async (data: {
  serviceType: string;
  environment: string;
  realmName: string;
  clientId: string;
  authType: string;
}) => {
  const { serviceType, environment, realmName, clientId, authType } = data;
  const { kcAdminClient, authServerUrl } = await getAdminClient({ serviceType, environment });
  const { realm, client } = await getClient(kcAdminClient, { serviceType, realmName, clientId });

  if (client.protocol === 'openid-connect') {
    return oidcGenerateInstallation({ kcAdminClient, realm, client, authServerUrl, authType });
  } else {
    return samlGenerateInstallation({ kcAdminClient, realm, client, authServerUrl });
  }
};

export const updateClientSecret = oidcUpdateClientSecret;

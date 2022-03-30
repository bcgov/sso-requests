import { getAdminClient, getClient } from './adminClient';

export const fetchClient = async (data: {
  serviceType: string;
  environment: string;
  realmName: string;
  clientId: string;
}) => {
  const { serviceType, environment, realmName, clientId } = data;

  const { kcAdminClient } = await getAdminClient({ serviceType, environment });
  const { realm, client } = await getClient(kcAdminClient, { serviceType, realmName, clientId });
  return client;
};

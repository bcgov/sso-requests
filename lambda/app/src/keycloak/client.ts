import { Integration } from '@app/interfaces/Request';
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

export const disableClient = async (data: {
  serviceType: string;
  environment: string;
  realmName: string;
  clientId: string;
}) => {
  const { serviceType, environment, realmName, clientId } = data;

  const { kcAdminClient } = await getAdminClient({ serviceType, environment });
  const { realm, client } = await getClient(kcAdminClient, { serviceType, realmName, clientId });
  if (!client) throw Error('client not found');

  await kcAdminClient.clients.update(
    { realm: realm.realm, id: client.id },
    {
      clientId: client.clientId,
      enabled: false,
    },
  );
};

export const disableIntegration = async (integration: Integration) => {
  const { serviceType, environments, realm: realmName, clientId } = integration;

  const proms = [];
  environments.forEach((environment) => {
    proms.push(disableClient({ serviceType, environment, realmName, clientId }));
  });

  await Promise.all(proms);
};

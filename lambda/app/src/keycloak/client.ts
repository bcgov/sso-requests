import { getAdminClient } from './adminClient';

export const fetchClient = async (data: { environment: string; realmName: string; clientId: string }) => {
  console.log(data);
  const { environment, realmName, clientId } = data;

  const { kcAdminClient, authServerUrl } = await getAdminClient({ environment });

  const realm = await kcAdminClient.realms.findOne({ realm: realmName });
  const clients = await kcAdminClient.clients.find({ realm: realm.realm });
  const client = clients.find((client) => client.clientId === clientId);

  return client;
};

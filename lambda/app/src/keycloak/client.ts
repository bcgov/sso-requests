import { getAdminClient } from './adminClient';

export const fetchClient = async (data: { environment: string; realmName: string; clientId: string }) => {
  const { environment, realmName, clientId } = data;

  const { kcAdminClient } = await getAdminClient({ environment });

  const realm = await kcAdminClient.realms.findOne({ realm: realmName });
  const clients = await kcAdminClient.clients.find({ realm: realm.realm });
  return clients.find((client) => client.clientId === clientId);
};

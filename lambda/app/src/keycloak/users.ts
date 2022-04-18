import { findAllowedIntegrationInfo } from '@lambda-app/queries/request';
import { getAdminClient, getClient } from './adminClient';
import { fetchClient } from './client';

export const searchUsers = async ({
  environment,
  idp,
  property,
  searchKey,
}: {
  environment: string;
  idp: string;
  property: string;
  searchKey: string;
}) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });

  if (!['idir', 'bceidbasic', 'bceidbusiness', 'bceidboth'].includes(idp)) throw Error(`invalid idp ${idp}`);
  if (!['email', 'firstName', 'lastName', 'guid'].includes(property)) throw Error(`invalid property ${property}`);

  const query: any = {};
  if (property === 'guid') {
    query.username = `${searchKey}@${idp}`;
  } else {
    query.username = `@${idp}`;
    query[property] = searchKey;
  }

  const users = await kcAdminClient.users.find({ realm: 'standard', ...query });
  return users.map(({ username, firstName, lastName, email, attributes }) => ({
    username,
    firstName,
    lastName,
    email,
    attributes,
  }));
};

export const listClientRoles = async (
  sessionUserId: number,
  {
    environment,
    integrationId,
  }: {
    environment: string;
    integrationId: number;
  },
) => {
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientName, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const roles = await kcAdminClient.clients.listRoles({ realm: 'standard', id: client.id });
  return roles.map((role) => role.name);
};

export const listUserRoles = async (
  sessionUserId: number,
  {
    environment,
    integrationId,
    username,
  }: {
    environment: string;
    integrationId: number;
    username: string;
  },
) => {
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const idp = username.split('@')[1];
  if (!integration.devIdps.includes(idp)) throw Error('invalid idp');

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientName, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const users = await kcAdminClient.users.find({ realm: 'standard', username, max: 1 });
  if (users.length === 0) throw Error('user not found');

  const roles = await kcAdminClient.users.listClientRoleMappings({
    realm: 'standard',
    id: users[0].id,
    clientUniqueId: client.id,
  });

  return roles.map((role) => role.name);
};

export const manageUserRole = async (
  sessionUserId: number,
  {
    environment,
    integrationId,
    username,
    roleName,
    mode,
  }: {
    environment: string;
    integrationId: number;
    username: string;
    roleName: string;
    mode: 'add' | 'del';
  },
) => {
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const idp = username.split('@')[1];
  if (!integration.devIdps.includes(idp)) throw Error('invalid idp');

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientName, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const users = await kcAdminClient.users.find({ realm: 'standard', username, max: 1 });
  if (users.length === 0) throw Error('user not found');

  const role = await kcAdminClient.clients.findRole({ realm: 'standard', id: client.id, roleName });
  if (!role) throw Error('role not found');

  const roleMapping = {
    realm: 'standard',
    id: users[0].id,
    clientUniqueId: client.id,
  };

  const roleMappingUpdate = { ...roleMapping, roles: [{ id: role.id, name: role.name }] };

  if (mode === 'del') {
    await kcAdminClient.users.delClientRoleMappings(roleMappingUpdate);
  } else {
    await kcAdminClient.users.addClientRoleMappings(roleMappingUpdate);
  }

  const roles = await kcAdminClient.users.listClientRoleMappings(roleMapping);
  return roles.map((role) => role.name);
};

import { findAllowedIntegrationInfo } from '@lambda-app/queries/request';
import { forEach, map } from 'lodash';
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
    first = 0,
    max = 50,
  }: {
    environment: string;
    integrationId: number;
    first: number;
    max: number;
  },
) => {
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientName, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  // @ts-ignore
  const roles = await kcAdminClient.clients.listRoles({ realm: 'standard', id: client.id, first, max });
  return roles.map((role) => role.name);
};

export const listRoleUsers = async (
  sessionUserId: number,
  {
    environment,
    integrationId,
    roleName,
    first = 0,
    max = 50,
  }: {
    environment: string;
    integrationId: number;
    roleName: string;
    first: number;
    max: number;
  },
) => {
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientName, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const users = await kcAdminClient.clients.findUsersWithRole({
    realm: 'standard',
    id: client.id,
    roleName,
    first,
    max,
  });
  return users;
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

export const createRole = async (
  sessionUserId: number,
  {
    environment,
    integrationId,
    roleName,
  }: {
    environment: string;
    integrationId: number;
    roleName: string;
  },
) => {
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientName, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const role = await kcAdminClient.clients.createRole({
    id: client.id,
    realm: 'standard',
    name: roleName,
    description: '',
    composite: false,
    clientRole: true,
    containerId: client.id,
    attributes: {},
  });

  return role;
};

interface NewRole {
  name: string;
  envs: string[];
}

export const bulkCreateRole = async (
  sessionUserId: number,
  {
    integrationId,
    roles,
  }: {
    integrationId: number;
    roles: NewRole[];
  },
) => {
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const byEnv = { dev: [], test: [], prod: [] };
  forEach(roles, (role) => {
    if (role.envs)
      forEach(role.envs, (env) => {
        if (byEnv[env]) byEnv[env].push(role.name);
      });
  });

  await Promise.all(
    map(byEnv, async (roleNames, env) => {
      const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment: env });
      const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientName, max: 1 });
      if (clients.length === 0) return;
      const client = clients[0];

      for (let x = 0; x < roleNames.length; x++) {
        const role = await kcAdminClient.clients.createRole({
          id: client.id,
          realm: 'standard',
          name: roleNames[x],
          description: '',
          composite: false,
          clientRole: true,
          containerId: client.id,
          attributes: {},
        });
      }
    }),
  );

  return { success: true };
};

export const deleteRole = async (
  sessionUserId: number,
  {
    environment,
    integrationId,
    roleName,
  }: {
    environment: string;
    integrationId: number;
    roleName: string;
  },
) => {
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientName, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const role = await kcAdminClient.clients.delRole({
    id: client.id,
    realm: 'standard',
    roleName,
  });

  return role;
};

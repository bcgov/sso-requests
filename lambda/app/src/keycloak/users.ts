import { findAllowedIntegrationInfo } from '@lambda-app/queries/request';
import { forEach, map, get } from 'lodash';
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
  if (searchKey?.length < 2) return [];

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });

  if (!['idir', 'bceidbasic', 'bceidbusiness', 'bceidboth'].includes(idp)) throw Error(`invalid idp ${idp}`);
  if (!['email', 'firstName', 'lastName', 'guid'].includes(property)) throw Error(`invalid property ${property}`);

  const query: any = {};
  if (property === 'guid') {
    query.username = `${searchKey}@${idp}`;
    query.exact = true;
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
    search = '',
    first = 0,
    max = 50,
  }: {
    environment: string;
    integrationId: number;
    search?: string;
    first: number;
    max: number;
  },
) => {
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  // @ts-ignore
  const roles = await kcAdminClient.clients.listRoles({ realm: 'standard', id: client.id, search, first, max });
  return roles.map((role) => role.name);
};

export const findClientRole = async (
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
  if (roleName?.length < 2) return null;
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const role = await kcAdminClient.clients.findRole({ realm: 'standard', id: client.id, roleName });
  return role;
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
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
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
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
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
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
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
  if (roleName?.length < 2) return [];

  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
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

  // create 20 roles at a time
  const rolesToCreate = roles.slice(0, 20);

  const byEnv = { dev: [], test: [], prod: [] };
  forEach(rolesToCreate, (role) => {
    if (role.envs)
      forEach(role.envs, (env) => {
        if (byEnv[env] && role.name?.length >= 2) byEnv[env].push(role.name);
      });
  });

  const results = await Promise.all(
    map(byEnv, async (roleNames, env) => {
      const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment: env });
      const result = { env, success: [], duplicate: [], failure: [], clientNotFound: false };

      const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
      if (clients.length === 0) {
        result.clientNotFound = true;
        result.failure = roleNames;
        return result;
      }

      const client = clients[0];

      for (let x = 0; x < roleNames.length; x++) {
        const roleName = roleNames[x];
        await kcAdminClient.clients
          .createRole({
            id: client.id,
            realm: 'standard',
            name: roleName,
            description: '',
            composite: false,
            clientRole: true,
            containerId: client.id,
            attributes: {},
          })
          .then(() => result.success.push(roleName))
          .catch((error) => {
            const msg = get(error, 'response.data.errorMessage');
            if (msg.endsWith('already exists')) {
              result.duplicate.push(roleName);
            } else {
              result.failure.push(roleName);
            }
          });
      }

      return result;
    }),
  );

  return results;
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
  if (roleName?.length < 2) return null;
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const role = await kcAdminClient.clients.delRole({
    id: client.id,
    realm: 'standard',
    roleName,
  });

  return role;
};

export const createIdirUser = async ({
  environment,
  guid,
  userId,
  email,
  firstName,
  lastName,
  displayName,
}: {
  environment: string;
  guid: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
}) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });

  const lowGuid = guid.toLowerCase();
  let parentUser = null;
  let standardUser = null;

  const existingParentUsers = await kcAdminClient.users.find({ realm: 'idir', username: lowGuid, max: 1 });
  if (existingParentUsers.length > 0) {
    parentUser = existingParentUsers[0];
  } else {
    parentUser = await kcAdminClient.users.create({
      realm: 'idir',
      username: guid,
      email,
      firstName,
      lastName,
      attributes: {
        display_name: displayName,
        idir_user_guid: guid,
        idir_username: userId,
      },
      enabled: true,
    });

    await kcAdminClient.users.addToFederatedIdentity({
      realm: 'idir',
      id: parentUser.id,
      federatedIdentityId: 'idir',
      federatedIdentity: {
        userId: guid,
        userName: guid,
        identityProvider: 'idir',
      },
    });
  }

  const existingStandardUsers = await kcAdminClient.users.find({
    realm: 'standard',
    username: `${lowGuid}@idir`,
    max: 1,
  });

  if (existingStandardUsers.length > 0) {
    standardUser = existingStandardUsers[0];
  } else {
    standardUser = await kcAdminClient.users.create({
      realm: 'standard',
      username: `${guid}@idir`,
      email,
      firstName,
      lastName,
      attributes: {
        display_name: displayName,
        idir_user_guid: guid,
        idir_username: userId,
      },
      enabled: true,
    });

    await kcAdminClient.users.addToFederatedIdentity({
      realm: 'idir',
      id: standardUser.id,
      federatedIdentityId: 'idir',
      federatedIdentity: {
        userId: parentUser.id,
        userName: guid,
        identityProvider: 'idir',
      },
    });
  }

  return standardUser;
};

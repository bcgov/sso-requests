import KcAdminClient from 'keycloak-admin';
import RoleRepresentation from 'keycloak-admin/lib/defs/roleRepresentation';
import { findAllowedIntegrationInfo } from '@lambda-app/queries/request';
import { forEach, map, get, difference } from 'lodash';
import { getAdminClient, getClient } from './adminClient';
import { fetchClient } from './client';
import { Data } from '@lambda-shared/interfaces';

// Helpers
// TODO: encapsulate admin client with user session and associated client infomation
const getRoleByName = async (kcClient: KcAdminClient, clientId: string, roleName: string) => {
  // @ts-ignore
  const role = await kcClient.clients.findRole({ realm: 'standard', id: clientId, roleName });
  return role;
};

const populateComposites = async (kcClient: KcAdminClient, clientId: string, role: RoleRepresentation) => {
  if (!role.composite) {
    return {
      name: role.name,
      composites: [],
    };
  }

  const composites = await kcClient.roles.getCompositeRolesForClient({
    realm: 'standard',
    clientId,
    id: role.id,
  });

  return {
    name: role.name,
    composites: composites.map((comp) => comp.name),
  };
};

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
    query.max = 500;
    query.first = 0;
  }

  const users = await kcAdminClient.users.find({ realm: 'standard', ...query });
  const result: { count: number; rows: any[] } = {
    count: users.length,
    rows: users.map(({ username, firstName, lastName, email, attributes }) => ({
      username,
      firstName,
      lastName,
      email,
      attributes,
    })),
  };

  return result;
};

const MAX_CLIENT_ROLE_COUNT = 5000;
export const listClientRoles = async (
  integration: Data,
  {
    environment,
    integrationId,
    search = '',
    first = 0,
    max = MAX_CLIENT_ROLE_COUNT,
  }: {
    environment: string;
    integrationId: number;
    search?: string;
    first?: number;
    max?: number;
  },
) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  if (max > MAX_CLIENT_ROLE_COUNT) max = MAX_CLIENT_ROLE_COUNT;

  // @ts-ignore
  const roles: any[] = await kcAdminClient.clients.listRoles({ realm: 'standard', id: client.id, search, first, max });

  return roles.map((role) => role.name);
};

export const getCompositeClientRoles = async (
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
  if (integration.authType === 'service-account') throw Error('invalid auth type');

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const role = await getRoleByName(kcAdminClient, client.id, roleName);
  if (!role) throw Error('role not found');

  const populatedRole = await populateComposites(kcAdminClient, client.id, role);
  return populatedRole.composites;
};

export const setCompositeClientRoles = async (
  sessionUserId: number,
  {
    environment,
    integrationId,
    roleName,
    compositeRoleNames,
  }: {
    environment: string;
    integrationId: number;
    roleName: string;
    compositeRoleNames: string[];
  },
) => {
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);
  if (integration.authType === 'service-account') throw Error('invalid auth type');

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const role = await getRoleByName(kcAdminClient, client.id, roleName);
  if (!role) throw Error('role not found');

  const rolesToDel = await kcAdminClient.roles.getCompositeRolesForClient({
    realm: 'standard',
    clientId: client.id,
    id: role.id,
  });

  const rolesToAdd = await Promise.all(
    compositeRoleNames.map((roleName) => getRoleByName(kcAdminClient, client.id, roleName)),
  );

  // 1. remove all composite roles first
  await kcAdminClient.roles.delCompositeRoles({ realm: 'standard', id: role.id }, rolesToDel);

  // 2. add composite roles
  await kcAdminClient.roles.createComposite({ realm: 'standard', roleId: role.id }, rolesToAdd);

  return populateComposites(kcAdminClient, client.id, role);
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
  if (integration.authType === 'service-account') throw Error('invalid auth type');

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const role = await kcAdminClient.clients.findRole({ realm: 'standard', id: client.id, roleName });
  return role;
};

export const listRoleUsers = async (
  integration: Data,
  {
    environment,
    roleName,
    first = 0,
    max = 50,
  }: {
    environment: string;
    roleName: string;
    first?: number;
    max?: number;
  },
) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const roles: any[] = await kcAdminClient.clients.listRoles({
    realm: 'standard',
    id: client.id,
    // @ts-ignore
    search: '',
    first: 0,
    max: MAX_CLIENT_ROLE_COUNT,
  });

  if (!roles.find((role) => role.name === roleName)) throw Error('role not found');

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
  integration: Data,
  {
    environment,
    username,
  }: {
    environment: string;
    username: string;
  },
) => {
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
  integration: Data,
  {
    environment,
    username,
    roleName,
    mode,
  }: {
    environment: string;
    username: string;
    roleName: string;
    mode: 'add' | 'del';
  },
) => {
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

export const manageUserRoles = async (
  integration: Data,
  {
    environment,
    username,
    roleNames,
  }: {
    environment: string;
    username: string;
    roleNames: string[];
  },
) => {
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

  const rnames = roles.map((role) => role.name);
  const rolesToAdd = difference(roleNames, rnames);
  const rolesToDel = difference(rnames, roleNames);

  const roleMapping = {
    realm: 'standard',
    id: users[0].id,
    clientUniqueId: client.id,
  };

  const findRole = (roleName) => kcAdminClient.clients.findRole({ realm: 'standard', id: client.id, roleName });

  const addPromise = Promise.all(rolesToAdd.map((roleName) => findRole(roleName))).then((roles) =>
    kcAdminClient.users.addClientRoleMappings({ ...roleMapping, roles }),
  );

  const delPromise = Promise.all(rolesToDel.map((roleName) => findRole(roleName))).then((roles) =>
    kcAdminClient.users.delClientRoleMappings({ ...roleMapping, roles }),
  );

  await Promise.all([addPromise, delPromise]);

  return true;
};

export const createRole = async (
  integration: Data,
  role: {
    environment: string;
    integrationId: number;
    roleName: string;
  },
) => {
  const { roleName, environment } = role;

  if (roleName?.length < 2) return [];

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  return await kcAdminClient.clients.createRole({
    id: client.id,
    realm: 'standard',
    name: roleName,
    description: '',
    composite: false,
    clientRole: true,
    containerId: client.id,
    attributes: {},
  });
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
  if (integration.authType === 'service-account') throw Error('invalid auth type');

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
  integration: Data,
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

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const role = await getRoleByName(kcAdminClient, client.id, roleName);
  if (!role) throw Error('role not found');

  const deletedRole = await kcAdminClient.clients.delRole({
    id: client.id,
    realm: 'standard',
    roleName,
  });

  return deletedRole;
};

export const updateRole = async (
  integration: Data,
  {
    environment,
    integrationId,
    roleName,
    newRoleName,
  }: {
    environment: string;
    integrationId: number;
    roleName: string;
    newRoleName: string;
  },
) => {
  if (roleName?.length < 2) return null;

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw Error('client not found');
  const client = clients[0];

  const role = await getRoleByName(kcAdminClient, client.id, roleName);
  if (!role) throw Error('role not found');

  const updatedRole = await kcAdminClient.clients.updateRole(
    {
      id: client.id,
      realm: 'standard',
      roleName,
    },
    {
      id: client.id,
      name: newRoleName,
      description: '',
      composite: false,
      clientRole: true,
      containerId: client.id,
      attributes: {},
    },
  );
  return updatedRole;
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
      realm: 'standard',
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

export const findUserByRealm = async (environment: string, username: string) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  return await kcAdminClient.users.find({ realm: 'standard', username, max: 1 });
};

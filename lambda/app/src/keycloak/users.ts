import KcAdminClient from 'keycloak-admin';
import RoleRepresentation from 'keycloak-admin/lib/defs/roleRepresentation';
import { findAllowedIntegrationInfo } from '@lambda-app/queries/request';
import forEach from 'lodash.foreach';
import map from 'lodash.map';
import get from 'lodash.get';
import difference from 'lodash.difference';
import { getAdminClient } from './adminClient';
import { Integration } from '@app/interfaces/Request';
import { UserQuery } from 'keycloak-admin/lib/resources/users';
import { asyncFilter } from '../helpers/array';
import createHttpError from 'http-errors';

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
  clientId,
}: {
  environment: string;
  idp: string;
  property: string;
  searchKey: string;
  clientId?: string;
}) => {
  if (searchKey?.length < 2) return [];
  const userProperties = {};
  userProperties[property] = searchKey;

  if (idp.startsWith('bceid') && clientId)
    return searchBCeIDusersByIntegration({ environment, idp, userProperties, clientId });
  else return searchUsersByIdp({ environment, idp, userProperties });
};

const MAX_CLIENT_ROLE_COUNT = 5000;
export const listClientRoles = async (
  integration: Integration,
  {
    environment,
    integrationId,
    search = '',
    first = 0,
    max = MAX_CLIENT_ROLE_COUNT,
  }: {
    environment: string;
    integrationId?: number;
    search?: string;
    first?: number;
    max?: number;
  },
) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  if (max > MAX_CLIENT_ROLE_COUNT) max = MAX_CLIENT_ROLE_COUNT;

  // @ts-ignore
  const roles: any[] = await kcAdminClient.clients.listRoles({ realm: 'standard', id: client.id, search, first, max });
  return roles;
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
  if (integration.authType === 'service-account')
    throw new createHttpError[400](`invalid auth type ${integration.authType}`);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  const role = await getRoleByName(kcAdminClient, client.id, roleName);
  if (!role) throw new createHttpError[404](`role ${roleName} not found`);

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
  if (integration.authType === 'service-account')
    throw new createHttpError[400](`invalid auth type ${integration.authType}`);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  const role = await getRoleByName(kcAdminClient, client.id, roleName);
  if (!role) throw new createHttpError[404](`role ${roleName} not found`);

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
  integration: Integration,
  {
    environment,
    roleName,
  }: {
    environment: string;
    roleName: string;
  },
) => {
  if (roleName?.length < 2) return null;
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  const role = await kcAdminClient.clients.findRole({ realm: 'standard', id: client.id, roleName });
  return role;
};

export const listRoleUsers = async (
  integration: Integration,
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
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  const roles: any[] = await kcAdminClient.clients.listRoles({
    realm: 'standard',
    id: client.id,
    // @ts-ignore
    search: '',
    first: 0,
    max: MAX_CLIENT_ROLE_COUNT,
  });

  if (!roles.find((role) => role.name === roleName)) throw new createHttpError[404](`role ${roleName} not found`);

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
  integration: Integration,
  {
    environment,
    username,
  }: {
    environment: string;
    username: string;
  },
) => {
  const idp = username.split('@')[1];
  if (!integration.devIdps.includes(idp)) throw new createHttpError[400](`invalid idp ${idp}`);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  const users = await kcAdminClient.users.find({ realm: 'standard', username, max: 1 });
  if (users.length === 0) throw new createHttpError[404](`user ${username} not found`);

  const roles = await kcAdminClient.users.listClientRoleMappings({
    realm: 'standard',
    id: users[0].id,
    clientUniqueId: client.id,
  });

  return roles;
};

export const manageUserRole = async (
  integration: Integration,
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
  if (!integration.devIdps.includes(idp)) throw new createHttpError[400](`invalid idp ${idp}`);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  const users = await kcAdminClient.users.find({ realm: 'standard', username, max: 1 });
  if (users.length === 0) throw new createHttpError[404](`user ${username} not found`);

  const role = await kcAdminClient.clients.findRole({ realm: 'standard', id: client.id, roleName });
  if (!role) throw new createHttpError[404](`role ${roleName} not found`);

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
  return roles;
};

export const manageUserRoles = async (
  integration: Integration,
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
  if (!integration.devIdps.includes(idp)) throw new createHttpError[400](`invalid idp ${idp}`);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  const users = await kcAdminClient.users.find({ realm: 'standard', username, max: 1 });
  if (users.length === 0) throw new createHttpError[404](`user ${username} not found`);

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
    // @ts-ignore
    kcAdminClient.users.addClientRoleMappings({ ...roleMapping, roles }),
  );

  const delPromise = Promise.all(rolesToDel.map((roleName) => findRole(roleName))).then((roles) =>
    // @ts-ignore
    kcAdminClient.users.delClientRoleMappings({ ...roleMapping, roles }),
  );

  await Promise.all([addPromise, delPromise]);

  return true;
};

export const createRole = async (
  integration: Integration,
  role: {
    environment: string;
    integrationId: number;
    roleName: string;
  },
) => {
  try {
    const { roleName, environment } = role;

    if (roleName?.length < 2) return [];

    const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
    const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
    if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
    const client = clients[0];

    const result = await kcAdminClient.clients.createRole({
      id: client.id,
      realm: 'standard',
      name: roleName,
      description: '',
      composite: false,
      clientRole: true,
      containerId: client.id,
      attributes: {},
    });

    return result;
  } catch (err) {
    throw new createHttpError[err.response.status](err.response.data.errorMessage);
  }
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

  if (integration.authType === 'service-account')
    throw new createHttpError[400](`invalid auth type ${integration.authType}`);

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
      const result = { env, success: [], duplicate: [], failure: [], clientNotFound: false };

      if (roleNames.length === 0) {
        return result;
      }

      const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment: env });

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
  integration: Integration,
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
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  const role = await getRoleByName(kcAdminClient, client.id, roleName);
  if (!role) throw new createHttpError[404](`role ${roleName} not found`);

  const deletedRole = await kcAdminClient.clients.delRole({
    id: client.id,
    realm: 'standard',
    roleName,
  });

  return deletedRole;
};

export const updateRole = async (
  integration: Integration,
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
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  const role = await getRoleByName(kcAdminClient, client.id, roleName);
  if (!role) throw new createHttpError[404](`role ${roleName} not found`);

  const newRoleExists = await getRoleByName(kcAdminClient, client.id, newRoleName);
  if (newRoleExists) throw new createHttpError[409](`role ${newRoleName} already exists`);

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
  const username = `${lowGuid}@idir`;

  let standardUser = null;

  const existingStandardUsers = await kcAdminClient.users.find({
    realm: 'standard',
    username,
    max: 1,
  });

  if (existingStandardUsers.length > 0) {
    standardUser = existingStandardUsers[0];
  } else {
    standardUser = await kcAdminClient.users.create({
      realm: 'standard',
      username,
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
        userId: lowGuid,
        userName: lowGuid,
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

export const manageRoleComposites = async (
  environment: string,
  roleId: string,
  compositeRoles?: RoleRepresentation[],
  operation?: 'add' | 'del',
) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });

  if (operation === 'add') {
    await kcAdminClient.roles.createComposite({ realm: 'standard', roleId }, compositeRoles);
  } else {
    await kcAdminClient.roles.delCompositeRoles({ realm: 'standard', id: roleId }, compositeRoles);
  }
};

export const getRoleComposites = async (integration: Integration, environment: string, roleId: string) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId: integration.clientId, max: 1 });
  if (clients.length === 0) throw new createHttpError[404](`client ${integration.clientId} not found`);
  const client = clients[0];

  return await kcAdminClient.roles.getCompositeRolesForClient({
    realm: 'standard',
    clientId: client.id,
    id: roleId,
  });
};

export const searchUsersByIdp = async ({
  environment,
  idp,
  userProperties,
}: {
  environment: string;
  idp: string;
  userProperties: any;
}) => {
  for (let queryProp in userProperties) {
    if (!['email', 'firstName', 'lastName', 'guid'].includes(queryProp))
      throw new createHttpError[400](`invalid property ${queryProp}`);
  }

  if (idp.startsWith('bceid')) {
    if (userProperties > 1 || Object.keys(userProperties)[0] !== 'guid') {
      throw new createHttpError[400](`invalid user query - ${JSON.stringify(userProperties)}`);
    }
  }

  if (!['azureidir', 'idir', 'bceidbasic', 'bceidbusiness', 'bceidboth', 'githubpublic', 'githubbcgov'].includes(idp))
    throw new createHttpError[400](`invalid idp ${idp}`);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });

  const query: UserQuery = {};

  if (userProperties.guid && userProperties.guid !== '') {
    query.username = `${userProperties.guid}@${idp}`;
    query.exact = 'true';
  } else {
    query.username = `@${idp}`;
  }
  query.firstName = userProperties?.firstName;
  query.lastName = userProperties?.lastName;
  query.email = userProperties?.email;
  query.max = 500;
  query.first = 0;

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

export const searchBCeIDusersByIntegration = async ({
  environment,
  idp,
  userProperties,
  clientId,
}: {
  environment: string;
  idp: string;
  userProperties: any;
  clientId: string;
}) => {
  const props = Object.keys(userProperties);
  if (props.length === 0) throw new createHttpError[400]('no user properties are found');

  const prop = props[0];
  const propValue = userProperties[prop];

  if (!['email', 'firstName', 'lastName', 'guid'].includes(prop))
    throw new createHttpError[400](`invalid property ${prop}`);

  if (!idp.startsWith('bceid')) throw new createHttpError[400](`invalid idp ${idp}`);
  if (!propValue) throw new createHttpError[400](`empty search value`);

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });

  const query: UserQuery = {};

  if (prop === 'guid') {
    query.username = `${propValue}@${idp}`;
    query.exact = 'true';
  } else {
    query.username = `@${idp}`;
    query[prop] = propValue;
  }

  query.max = 500;
  query.first = 0;

  let users = await kcAdminClient.users.find({ realm: 'standard', ...query });

  if (!query.exact) {
    users = users.filter((user) => {
      if (!user[prop]) return false;
      return user[prop].toLowerCase() === propValue.toLowerCase();
    });
  }

  users = await asyncFilter(users, async (user) => {
    const roles = await kcAdminClient.users.listRealmRoleMappings({ realm: 'standard', id: user.id });
    return roles.find((role) => role.name === `client-${clientId}`);
  });

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

import { findAllowedIntegrationInfo } from '@lambda-app/queries/request';
import { canCreateOrDeleteRoles } from '@app/helpers/permissions';
import {
  listClientRoles,
  createRole,
  deleteRole,
  findClientRole,
  NewRole,
  bulkCreateRole,
  setCompositeClientRoles,
} from '../keycloak/users';
import { models } from '@lambda-shared/sequelize/models/models';
import { Op, Sequelize } from 'sequelize';

const validateIntegration = async (sessionUserId: number, integrationId: number) => {
  return await findAllowedIntegrationInfo(sessionUserId, integrationId);
};

export const createClientRole = async (
  sessionUserId: number,
  role: { environment: string; integrationId: number; roleName: string },
) => {
  const integration = await validateIntegration(sessionUserId, role?.integrationId);
  if (!canCreateOrDeleteRoles(integration)) throw Error('you are not authorized to create role');
  const dbRole = await models.requestRole.create({
    name: role?.roleName,
    environment: role?.environment,
    requestId: integration.id,
    createdBy: sessionUserId,
    lastUpdatedBy: sessionUserId,
  });
  if (!dbRole) throw Error(`Unable to save the role ${role?.roleName}`);
  return await createRole(integration, role);
};

export const bulkCreateClientRoles = async (
  sessionUserId: number,
  {
    integrationId,
    roles,
  }: {
    integrationId: number;
    roles: NewRole[];
  },
) => {
  try {
    const integration = await validateIntegration(sessionUserId, integrationId);
    if (!canCreateOrDeleteRoles(integration)) throw Error('You are not authorized to create role');

    if (roles.length > 20) throw Error('Only 20 roles can be created at a time');

    for (const role of roles) {
      const roleObjs = await Promise.all(
        role.envs.map((env) =>
          models.requestRole.create({
            name: role?.name,
            environment: env,
            requestId: integrationId,
            createdBy: sessionUserId,
            lastUpdatedBy: sessionUserId,
          }),
        ),
      );

      for (const res in roleObjs) {
        if (!res) throw Error(`Unable to save roles at this moment`);
      }
    }

    return await bulkCreateRole(integration, roles);
  } catch (err) {
    console.error(err?.message || err);
    throw Error('Unable to create roles');
  }
};

export const getClientRole = async (sessionUserId: number, role: any) => {
  const integration = await validateIntegration(sessionUserId, role?.integrationId);
  return await findClientRole(integration, role);
};

export const listRoles = async (sessionUserId: number, role: any) => {
  const integration = await validateIntegration(sessionUserId, role?.integrationId);
  return await listClientRoles(integration, role);
};

export const deleteRoles = async (sessionUserId: number, role: any) => {
  const integration = await validateIntegration(sessionUserId, role?.integrationId);
  if (!canCreateOrDeleteRoles(integration)) throw Error('you are not authorized to delete role');
  const dbRole = await models.requestRole.findOne({
    where: {
      name: role?.roleName,
      requestId: integration?.id,
      environment: role?.environment,
    },
  });
  if (!dbRole) {
    throw Error(`Role ${role?.roleName} not found`);
  } else {
    await dbRole.destroy();
  }
  return await deleteRole(integration, role);
};

export const setCompositeRoles = async (
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
  const integration = await validateIntegration(sessionUserId, integrationId);
  if (!canCreateOrDeleteRoles(integration)) throw Error('you are not authorized to create composite roles');

  const dbRole = await models.requestRole.findOne({
    where: {
      name: roleName,
      requestId: integration?.id,
      environment: environment,
    },
  });
  if (!dbRole) {
    throw Error(`Role ${roleName} not found`);
  }
  const dbCompositeRoles = await models.requestRole.findAll({
    where: {
      name: {
        [Op.in]: compositeRoleNames,
      },
      requestId: integration?.id,
      environment: environment,
    },
    raw: true,
  });
  if (dbCompositeRoles.length > 0) {
    dbRole.composite = true;
    dbRole.compositeRoles = dbCompositeRoles.map((cr) => cr.id);
  } else {
    dbRole.composite = false;
    dbRole.compositeRoles = [];
  }
  await dbRole.save();

  return await setCompositeClientRoles(integration, {
    environment,
    roleName,
    compositeRoleNames,
  });
};

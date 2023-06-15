import { findAllowedIntegrationInfo } from '@lambda-app/queries/request';
import { canCreateOrDeleteRoles } from '@app/helpers/permissions';
import {
  listClientRoles,
  listUserRoles,
  manageUserRole,
  manageUserRoles,
  listRoleUsers,
  createRole,
  bulkCreateRole,
  deleteRole,
  findClientRole,
  getCompositeClientRoles,
  setCompositeClientRoles,
} from '../keycloak/users';
import { resolveAny } from 'dns';

const validateIntegration = async (sessionUserId: number, role: any) => {
  const int = await findAllowedIntegrationInfo(sessionUserId, role.integrationId);
  if (int.authType === 'service-account') throw Error('invalid auth type');
  return int;
};

export const createClientRole = async (sessionUserId: number, role: any) => {
  const integration = await validateIntegration(sessionUserId, role);
  if (!canCreateOrDeleteRoles(integration)) throw Error('you are not authorized to create role');
  return await createRole(integration, role);
};

export const getClientRole = async (sessionUserId: number, role: any) => {
  const integration = await validateIntegration(sessionUserId, role);
  return await findClientRole(integration, role);
};

export const listRoles = async (sessionUserId: number, role: any) => {
  const integration = await validateIntegration(sessionUserId, role);
  return await listClientRoles(integration, role);
};

export const deleteRoles = async (sessionUserId: number, role: any) => {
  const integration = await validateIntegration(sessionUserId, role);
  if (!canCreateOrDeleteRoles(integration)) throw Error('you are not authorized to delete role');
  return await deleteRole(integration, role);
};

import { testClient } from '../test-client';
import { API_BASE_PATH } from '../constants';
import kcRolesHandler from '@app/pages/api/keycloak/roles';
import kcGetCompRolesHandler from '@app/pages/api/keycloak/get-composite-roles';
import kcRoleUsersHandler from '@app/pages/api/keycloak/role-users';

export const listClientRoles = async (integrationId: number) => {
  return await testClient(kcRolesHandler)
    .post(`${API_BASE_PATH}/keycloak/roles`)
    .send({
      environment: 'dev',
      integrationId,
      search: '',
      first: 0,
      max: 50,
    })
    .set('Accept', 'application/json');
};

export const listClientCompositeRoles = async (integrationId: number, roleName: string) => {
  return await testClient(kcGetCompRolesHandler)
    .post(`${API_BASE_PATH}/keycloak/get-composite-roles`)
    .send({
      environment: 'dev',
      integrationId,
      roleName,
    })
    .set('Accept', 'application/json');
};

export const listClientRoleUsers = async (integrationId: number, roleName: string) => {
  return await testClient(kcRoleUsersHandler)
    .post(`${API_BASE_PATH}/keycloak/role-users`)
    .send({
      environment: 'dev',
      integrationId,
      roleName,
      first: 0,
      max: 50,
    })
    .set('Accept', 'application/json');
};

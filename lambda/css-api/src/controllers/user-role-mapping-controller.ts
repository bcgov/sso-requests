import { findUserByRealm } from '@lambda-app/keycloak/users';
import { getValidator, postValidator, getUsersByRolenameValidator } from '../schemas/user-role-mapping';
import { injectable } from 'tsyringe';
import { UserRoleMappingService } from '../services/user-role-mapping-service';
import { parseErrors } from '../util';
import { RoleService } from '../services/role-service';
import createHttpError from 'http-errors';
import { updateUserProps } from '../helpers/users';
import { updateRoleProps } from '../helpers/roles';
import { ListUserRoleMappingQuery, RolePayload, UserRoleMappingPayload, ListUsersByRoleName } from '../types';

@injectable()
export class UserRoleMappingController {
  constructor(private userRoleMappingService: UserRoleMappingService, private roleService: RoleService) {}

  public async list(teamId: number, integrationId: number, environment: string, query: ListUserRoleMappingQuery) {
    const valid = getValidator(query || {});
    if (!valid) throw new createHttpError[400](parseErrors(getValidator.errors));
    return await this.userRoleMappingService.getAllByQuery(teamId, integrationId, environment, query);
  }

  public async manage(
    teamId: number,
    integrationId: number,
    environment: string,
    userRoleMapping: UserRoleMappingPayload,
  ) {
    const valid = postValidator(userRoleMapping || {});
    if (!valid) throw new createHttpError[400](parseErrors(postValidator.errors));

    return await this.userRoleMappingService.manageRoleMapping(teamId, integrationId, environment, userRoleMapping);
  }

  public async listRolesByUsername(teamId: number, integrationId: number, environment: string, username: string) {
    return await this.userRoleMappingService.listRolesByUsername(teamId, integrationId, environment, username);
  }

  public async listUsersByRolename(
    teamId: number,
    integrationId: number,
    environment: string,
    roleName: string,
    query: ListUsersByRoleName,
  ) {
    const valid = getUsersByRolenameValidator(query || {});
    if (!valid) throw new createHttpError[400](parseErrors(getUsersByRolenameValidator.errors));

    return await this.userRoleMappingService.listUsersByRolename(
      teamId,
      integrationId,
      environment,
      roleName,
      query.page,
      query.max,
    );
  }

  public async addRoleToUser(
    teamId: number,
    integrationId: number,
    environment: string,
    username: string,
    roles: RolePayload[],
  ) {
    return await this.userRoleMappingService.addRoleToUser(teamId, integrationId, environment, username, roles);
  }

  public async deleteRoleFromUser(
    teamId: number,
    integrationId: number,
    environment: string,
    username: string,
    roleName: string,
  ) {
    await this.userRoleMappingService.deleteRoleFromUser(teamId, integrationId, environment, username, roleName);
  }
}

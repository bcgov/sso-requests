import { getValidator, postValidator, getUsersByRolenameValidator } from '@/schemas/user-role-mapping';
import { inject, injectable } from 'tsyringe';
import { UserRoleMappingService } from '@/services/user-role-mapping-service';
import { parseErrors } from '@/utils';
import createHttpError from 'http-errors';
import { ListUserRoleMappingQuery, RolePayload, UserRoleMappingPayload, ListUsersByRoleName } from '@/types';
import { AuthContext } from '@/modules/authorization';

@injectable()
export class UserRoleMappingController {
  constructor(@inject('UserRoleMappingService') private userRoleMappingService: UserRoleMappingService) {}

  public async list(authz: AuthContext, integrationId: number, environment: string, query: ListUserRoleMappingQuery) {
    const valid = getValidator(query || {});
    if (!valid) throw new createHttpError[400](parseErrors(getValidator.errors));
    return await this.userRoleMappingService.getAllByQuery(authz, integrationId, environment, query);
  }

  public async manage(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    userRoleMapping: UserRoleMappingPayload,
  ) {
    const valid = postValidator(userRoleMapping || {});
    if (!valid) throw new createHttpError[400](parseErrors(postValidator.errors));

    return await this.userRoleMappingService.manageRoleMapping(authz, integrationId, environment, userRoleMapping);
  }

  public async listRolesByUsername(authz: AuthContext, integrationId: number, environment: string, username: string) {
    return await this.userRoleMappingService.listRolesByUsername(authz, integrationId, environment, username);
  }

  public async listUsersByRolename(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    roleName: string,
    query: ListUsersByRoleName,
  ) {
    const valid = getUsersByRolenameValidator(query || {});
    if (!valid) throw new createHttpError[400](parseErrors(getUsersByRolenameValidator.errors));

    return await this.userRoleMappingService.listUsersByRolename(
      authz,
      integrationId,
      environment,
      roleName,
      query.page,
      query.max,
    );
  }

  public async addRoleToUser(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    username: string,
    roles: RolePayload[],
  ) {
    return await this.userRoleMappingService.addRoleToUser(authz, integrationId, environment, username, roles);
  }

  public async addRoleToUserWithProvisioning(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    username: string,
    roles: RolePayload[],
  ) {
    return await this.userRoleMappingService.addRoleToUserWithProvisioning(
      authz,
      integrationId,
      environment,
      username,
      roles,
    );
  }

  public async deleteRoleFromUser(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    username: string,
    roleName: string,
  ) {
    await this.userRoleMappingService.deleteRoleFromUser(authz, integrationId, environment, username, roleName);
  }
}

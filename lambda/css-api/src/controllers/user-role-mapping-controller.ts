import { findUserByRealm } from '@lambda-app/keycloak/users';
import { getValidator, postValidator } from '../schemas/user-role-mapping';
import { injectable } from 'tsyringe';
import { UserRoleMappingService } from '../services/user-role-mapping-service';
import { parseErrors } from '../util';
import { RoleService } from '../services/role-service';
import createHttpError from 'http-errors';
import { updateUserProps } from '../helpers/users';
import { updateRoleProps } from '../helpers/roles';
import { ListUserRoleMappingQuery, UserRoleMappingPayload } from '../types';

@injectable()
export class UserRoleMappingController {
  constructor(private userRoleMappingService: UserRoleMappingService, private roleService: RoleService) {}

  public async list(teamId: number, integrationId: number, environment: string, query: ListUserRoleMappingQuery) {
    const valid = getValidator(query);
    if (!valid) throw new createHttpError[400](parseErrors(getValidator.errors));
    return await this.userRoleMappingService.getAllByQuery(teamId, integrationId, environment, query);
  }

  public async manage(
    teamId: number,
    integrationId: number,
    environment: string,
    userRoleMapping: UserRoleMappingPayload,
  ) {
    const valid = postValidator(userRoleMapping);
    if (!valid) throw new createHttpError[400](parseErrors(postValidator.errors));

    return await this.userRoleMappingService.manageRoleMapping(teamId, integrationId, environment, userRoleMapping);
  }
}

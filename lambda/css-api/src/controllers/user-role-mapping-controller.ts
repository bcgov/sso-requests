import { findUserByRealm } from '@lambda-app/keycloak/users';
import { injectable } from 'tsyringe';
import { UserRoleMappingService } from '../services/user-role-mapping-service';

@injectable()
export class UserRoleMappingController {
  constructor(private userRoleMappingService: UserRoleMappingService) {}

  public async list(teamId: number, integrationId: number, environment: string, queryParams: any) {
    let users = [];
    let roles = [];

    if (!queryParams.roleName && !queryParams.username) throw Error(`either roleName or username is required`);

    if (queryParams.roleName && !queryParams.username) {
      users = await this.userRoleMappingService.getAllByRole(teamId, integrationId, environment, queryParams.roleName);
      if (users.length > 0) roles = [{ name: queryParams.roleName }];
    } else if (!queryParams.roleName && queryParams.username) {
      const userRoles = await this.userRoleMappingService.getAllByUser(
        teamId,
        integrationId,
        environment,
        queryParams.username,
      );

      roles = userRoles.map((role) => {
        return {
          name: role,
        };
      });
      if (roles.length > 0) users = await findUserByRealm(environment, queryParams.username);
    } else if (queryParams.roleName && queryParams.username) {
      const userRoles = await this.userRoleMappingService.getAllByUser(
        teamId,
        integrationId,
        environment,
        queryParams.username,
      );
      await this.userRoleMappingService.getAllByRole(teamId, integrationId, environment, queryParams.roleName);
      if (userRoles.includes(queryParams.roleName)) {
        users = await findUserByRealm(environment, queryParams.username);
        roles = [{ name: queryParams.roleName }];
      }
    }
    users = users.map((user) => {
      return {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        attributes: user.attributes,
      };
    });
    return { users, roles };
  }

  public async manage(
    teamId: number,
    integrationId: number,
    environment: string,
    userName: string,
    roleName: string,
    operation: string,
  ) {
    if (operation !== 'add' && operation !== 'del')
      throw Error(`invalid operation #${operation}. valid values are (add, del)`);
    return await this.userRoleMappingService.manageRoleMapping(
      teamId,
      integrationId,
      environment,
      userName,
      roleName,
      operation,
    );
  }
}
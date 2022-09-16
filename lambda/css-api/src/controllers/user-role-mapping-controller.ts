import { findUserByRealm } from '@lambda-app/keycloak/users';
import { getValidator, postValidator } from '../schemas/user-role-mapping';
import { injectable } from 'tsyringe';
import { UserRoleMappingService } from '../services/user-role-mapping-service';
import { parseErrors } from '../util';
import { RoleService } from '../services/role-service';
import createHttpError from 'http-errors';

type listQueryParams = {
  roleName: string;
  username: string;
};

type UserRoleMappingPayload = {
  roleName: string;
  username: string;
  operation: string;
};

@injectable()
export class UserRoleMappingController {
  constructor(private userRoleMappingService: UserRoleMappingService, private roleService: RoleService) {}

  public async list(teamId: number, integrationId: number, environment: string, queryParams: listQueryParams) {
    let users = [];
    let roles = [];

    const valid = getValidator(queryParams);

    if (!valid) throw new createHttpError[400](parseErrors(getValidator.errors));

    if (queryParams?.roleName) {
      if (!(await this.roleService.checkForExistingRole(teamId, integrationId, environment, queryParams?.roleName)))
        throw new createHttpError[404](`role ${queryParams?.roleName} not found`);
    }

    if (queryParams?.username) {
      const userFound = await findUserByRealm(environment, queryParams.username);
      if (userFound.length === 0) throw new createHttpError[404](`user ${queryParams?.username} not found`);
    }

    if (queryParams?.roleName && !queryParams?.username) {
      users = await this.userRoleMappingService.getAllByRole(teamId, integrationId, environment, queryParams.roleName);
      if (users.length > 0) roles = [{ name: queryParams?.roleName }];
    } else if (!queryParams?.roleName && queryParams?.username) {
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
    users = this.filterUserProps(users);
    return { users, roles };
  }

  public async manage(
    teamId: number,
    integrationId: number,
    environment: string,
    userRoleMapping: UserRoleMappingPayload,
  ) {
    let users;
    const valid = postValidator(userRoleMapping);
    if (!valid) throw new createHttpError[400](parseErrors(postValidator.errors));

    const { username, roleName, operation } = userRoleMapping;

    if (roleName) {
      if (!(await this.roleService.checkForExistingRole(teamId, integrationId, environment, roleName)))
        throw new createHttpError[404](`role ${roleName} not found`);
    }

    if (username) {
      users = await findUserByRealm(environment, username);
      if (users.length === 0) throw new createHttpError[404](`user ${username} not found`);
    }

    if (operation !== 'add' && operation !== 'del')
      throw Error(`invalid operation #${operation}. valid values are (add, del)`);

    if (operation === 'del') {
      const users = await this.userRoleMappingService.getAllByRole(teamId, integrationId, environment, roleName);
      if (users.length === 0) throw new createHttpError[404]('no user role mappings found');
    }

    const roles = await this.userRoleMappingService.manageRoleMapping(
      teamId,
      integrationId,
      environment,
      username,
      roleName,
      operation,
    );

    return {
      users: this.filterUserProps(users),
      roles: roles.map((role) => {
        return { name: role };
      }),
    };
  }

  public filterUserProps(users: any) {
    return users.map((user) => {
      return {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        attributes: user.attributes,
      };
    });
  }
}

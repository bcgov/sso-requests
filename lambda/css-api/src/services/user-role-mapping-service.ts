import { IntegrationService } from './integration-service';
import {
  listClientRoles,
  findUserByRealm,
  listRoleUsers,
  listUserRoles,
  manageUserRole,
  manageUserRoles,
} from '@lambda-app/keycloak/users';
import { injectable } from 'tsyringe';
import { ListUserRoleMappingQuery, Role, RolePayload, User, UserRoleMappingPayload } from '../types';
import { RoleService } from './role-service';
import createHttpError from 'http-errors';
import { updateUserProps } from '../helpers/users';
import { updateRoleProps } from '../helpers/roles';
import { Integration } from 'app/interfaces/Request';

@injectable()
export class UserRoleMappingService {
  constructor(private integrationService: IntegrationService, private roleService: RoleService) {}

  public async getAllByQuery(
    teamId: number,
    integrationId: number,
    environment: string,
    query: ListUserRoleMappingQuery,
  ) {
    let users = [];
    let roles = [];

    const int = this.integrationService.getById(integrationId, teamId);

    if (query?.roleName) {
      roles = await listClientRoles(int as Integration, { environment });
      if (!roles.find((role) => role.name === query?.roleName))
        throw new createHttpError[404](`role ${query?.roleName} not found`);
    }

    if (query?.username) {
      users = await findUserByRealm(environment, query.username);
      if (users.length === 0) throw new createHttpError[404](`user ${query?.username} not found`);
    }

    if (query?.roleName && !query?.username) {
      users = await this.getAllUsersByRole(teamId, integrationId, environment, query.roleName);
      roles = users.length > 0 ? [roles.find((role) => role.name === query?.roleName)] : [];
    } else if (query?.username && !query?.roleName) {
      roles = await this.getAllRolesByUser(teamId, integrationId, environment, query.username);
      roles = updateRoleProps(roles as Role[]);
      users = roles.length > 0 ? await findUserByRealm(environment, query.username) : [];
    } else if (query?.roleName && query?.username) {
      roles = await this.getAllRolesByUser(teamId, integrationId, environment, query.username);
      if (!(roles.length > 0) || !roles.find((role) => role.name === query.roleName)) {
        users = [];
        roles = [];
      } else {
        roles = [roles.find((role) => role.name === query.roleName)];
      }
    }
    users = updateUserProps(users);
    roles = updateRoleProps(roles as Role[]);
    return { users, roles };
  }

  public async getAllUsersByRole(teamId: number, integrationId: number, environment: string, roleName: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await listRoleUsers(int, { environment, roleName });
  }

  public async getAllRolesByUser(teamId: number, integrationId: number, environment: string, username: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await listUserRoles(int, { environment, username });
  }

  public async manageRoleMapping(
    teamId: number,
    integrationId: number,
    environment: string,
    userRoleMapping: UserRoleMappingPayload,
  ) {
    const int = await this.integrationService.getById(integrationId, teamId);
    let users: User[];
    let roles: Role[];

    const { username, roleName, operation } = userRoleMapping;

    if (roleName) {
      roles = await this.roleService.getAllByEnvironment(teamId, integrationId, environment);
      const roleExists = roles.find((role: RolePayload) => role.name === roleName);
      if (!roleExists) throw new createHttpError[404](`role ${roleName} not found`);
    }

    if (username) {
      users = (await findUserByRealm(environment, username)) as User[];
      if (users.length === 0) throw new createHttpError[404](`user ${username} not found`);
    }

    if (!['add', 'del'].includes(operation))
      throw new createHttpError[400](`invalid operation #${operation}. valid values are (add, del)`);

    if (operation === 'del') {
      const users = await this.getAllUsersByRole(teamId, integrationId, environment, roleName);
      if (users.length === 0) throw new createHttpError[404]('no user role mappings found');
    }
    roles = (await manageUserRole(int, { environment, username, roleName, mode: operation })) as Role[];

    return {
      users: updateUserProps(users),
      roles: updateRoleProps(roles),
    };
  }
}

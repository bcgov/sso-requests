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
import includes from 'lodash.includes';
import { listOfrolesValidator } from '../schemas/role';
import { parseErrors } from '../util';

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

    const int = await this.integrationService.getById(integrationId, teamId);

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

  public async getAllUsersByRole(
    teamId: number,
    integrationId: number,
    environment: string,
    roleName: string,
    first?: number,
    max?: number,
  ) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await listRoleUsers(int, { environment, roleName, first, max });
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

  public async listRolesByUsername(teamId: number, integrationId: number, environment: string, username: string) {
    const user = await findUserByRealm(environment, username);
    if (!user) throw new createHttpError[404](`user ${username} not found`);
    const roles = await this.getAllRolesByUser(teamId, integrationId, environment, username);
    return { data: updateRoleProps(roles as Role[]) };
  }

  public async listUsersByRolename(
    teamId: number,
    integrationId: number,
    environment: string,
    roleName: string,
    page: number = 1,
    max: number = 50,
  ) {
    const first = page > 1 ? max * (page - 1) : 0;
    const userList = await this.getAllUsersByRole(teamId, integrationId, environment, roleName, first, max);
    return { page, data: updateUserProps(userList as User[]) };
  }

  public async addRoleToUser(
    teamId: number,
    integrationId: number,
    environment: string,
    username: string,
    roles: RolePayload[],
  ) {
    const valid = listOfrolesValidator(roles);
    if (!valid) throw new createHttpError[400](parseErrors(listOfrolesValidator.errors));
    const int = await this.integrationService.getById(integrationId, teamId);

    for (let role of roles) {
      this.roleService.validateRole(role);
      await manageUserRole(int, { environment, username, roleName: role.name, mode: 'add' });
    }
    return await this.listRolesByUsername(teamId, integrationId, environment, username);
  }

  public async deleteRoleFromUser(
    teamId: number,
    integrationId: number,
    environment: string,
    username: string,
    roleName: string,
  ) {
    this.roleService.validateRole({ name: roleName });
    const int = await this.integrationService.getById(integrationId, teamId);
    const existingUserRoles = await this.getAllRolesByUser(teamId, integrationId, environment, username);
    if (!existingUserRoles.find((existingRole) => existingRole.name === roleName))
      throw new createHttpError[400](`role ${roleName} is not associated with user ${username}`);
    await manageUserRole(int, { environment, username, roleName, mode: 'del' });
  }
}

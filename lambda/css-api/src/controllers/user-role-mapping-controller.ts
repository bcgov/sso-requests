import { injectable } from 'tsyringe';
import { RoleService } from '../services/role-service';
import { UserRoleMappingService } from '../services/user-role-mapping-service';

@injectable()
export class UserRoleMappingController {
  constructor(private userRoleMappingService: UserRoleMappingService, private roleService: RoleService) {}

  public async list(teamId: number, integrationId: number, environment: string, queryParams: any) {
    if (queryParams.roleName) {
      return await this.listByRole(teamId, integrationId, environment, queryParams.roleName);
    } else if (queryParams.username) {
      return await this.listByUser(teamId, integrationId, environment, queryParams.username);
    }
  }

  public async listByRole(teamId: number, integrationId: number, environment: string, roleName: string) {
    const users = await this.userRoleMappingService.getAllByRole(teamId, integrationId, environment, roleName);

    return users.map((user) => {
      return { username: user.username, roleName };
    });
  }

  public async listByUser(teamId: number, integrationId: number, environment: string, username: string) {
    const roles = await this.userRoleMappingService.getAllByUser(teamId, integrationId, environment, username);
    return roles.map((role) => {
      return {
        username,
        roleName: role,
      };
    });
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

import { RoleService } from '../services/RoleService';
import { UserRoleMappingService } from '../services/UserRoleMappingService';

interface UserRoleMapping {
  role: string;
  users: any;
}

export class UserRoleMappingController {
  private readonly userRoleMappingService: UserRoleMappingService;
  private readonly roleService: RoleService;

  constructor() {
    this.userRoleMappingService = new UserRoleMappingService();
    this.roleService = new RoleService();
  }

  public async list(teamId: number, integrationId: number, environment: string) {
    const roles = await this.roleService.getAllByEnvironment(teamId, integrationId, environment);
    const result: UserRoleMapping[] = [];

    for (let role of roles) {
      let users = await this.userRoleMappingService.getAllByRole(teamId, integrationId, environment, role);
      result.push({
        role,
        users: users.map((user) => {
          return {
            username: user.username,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            attributes: user.attributes,
          };
        }),
      });
    }
    return result;
  }

  public async get(teamId: number, integrationId: number, environment: string, role: string) {
    const users = await this.userRoleMappingService.getAllByRole(teamId, integrationId, environment, role);
    return {
      role,
      users: users.map((user) => {
        return {
          username: user.username,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          attributes: user.attributes,
        };
      }),
    };
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

import { injectable } from 'tsyringe';
import { RoleService } from '../services/role-service';

@injectable()
export class RoleController {
  constructor(private roleService: RoleService) {}

  public async list(integrationId: number, teamId: number, environment: string) {
    return await this.roleService.getAllByEnvironment(integrationId, teamId, environment);
  }

  public async create(teamId: number, integrationId: number, roleName: string, environment: string) {
    return await this.roleService.createRole(teamId, integrationId, roleName, environment);
  }

  public async delete(teamId: number, integrationId: number, roleName: string, environment: string) {
    return await this.roleService.deleteRole(teamId, integrationId, roleName, environment);
  }

  public async update(
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    newRoleName: string,
  ) {
    return await this.roleService.updateRole(teamId, integrationId, roleName, environment, newRoleName);
  }
}

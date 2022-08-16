import { RoleService } from '../services/RoleService';

export class RoleController {
  public async list(integrationId: number, teamId: number, environment: string) {
    return await new RoleService().getAllByEnvironment(integrationId, teamId, environment);
  }

  public async create(teamId: number, integrationId: number, roleName: string, environment: string) {
    return await new RoleService().createRole(teamId, integrationId, roleName, environment);
  }

  public async delete(teamId: number, integrationId: number, roleName: string, environment: string) {
    return await new RoleService().deleteRole(teamId, integrationId, roleName, environment);
  }

  public async update(
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    newRoleName: string,
  ) {
    return await new RoleService().updateRole(teamId, integrationId, roleName, environment, newRoleName);
  }
}

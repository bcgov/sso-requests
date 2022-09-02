import { createRole, deleteRole, listClientRoles, updateRole } from '@lambda-app/keycloak/users';
import { injectable } from 'tsyringe';
import { IntegrationService } from './integration-service';

@injectable()
export class RoleService {
  constructor(private integrationService: IntegrationService) {}

  public async getAllByEnvironment(teamId: number, integrationId: number, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await listClientRoles(int, { environment, integrationId });
  }

  public async getByName(teamId: number, integrationId: number, environment: string, roleName: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const roles = await listClientRoles(int, { environment, integrationId });
    if (!roles.includes(roleName)) throw Error(`role ${roleName} not found`);
    return { name: roleName };
  }

  public async createRole(teamId: number, integrationId: number, roleName: string, environment: string) {
    const role = roleName.trim();
    if (role.length === 0) throw Error('invalid role');
    const int = await this.integrationService.getById(integrationId, teamId);
    return await createRole(int, { environment, integrationId, roleName: role });
  }

  public async deleteRole(teamId: number, integrationId: number, roleName: string, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await deleteRole(int, { environment, integrationId, roleName });
  }

  public async updateRole(
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    newRoleName: string,
  ) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await updateRole(int, { environment, integrationId, roleName, newRoleName });
  }
}

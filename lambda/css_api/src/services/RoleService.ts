import { createRole, deleteRole, listClientRoles, updateRole } from '@lambda-app/keycloak/users';
import { IntegrationService } from './IntegrationService';

export class RoleService {
  public async getAllByEnvironment(teamId: number, integrationId: number, environment: string) {
    const int = await new IntegrationService().getById(integrationId, teamId);
    return await listClientRoles(int, { environment, integrationId });
  }

  public async createRole(teamId: number, integrationId: number, roleName: string, environment: string) {
    const int = await new IntegrationService().getById(integrationId, teamId);
    return await createRole(int, { environment, integrationId, roleName });
  }

  public async deleteRole(teamId: number, integrationId: number, roleName: string, environment: string) {
    const int = await new IntegrationService().getById(integrationId, teamId);
    return await deleteRole(int, { environment, integrationId, roleName });
  }

  public async updateRole(
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    newRoleName: string,
  ) {
    const int = await new IntegrationService().getById(integrationId, teamId);
    return await updateRole(int, { environment, integrationId, roleName, newRoleName });
  }
}

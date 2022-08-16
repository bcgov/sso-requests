import { IntegrationService } from './IntegrationService';
import { listRoleUsers, manageUserRole, manageUserRoles } from '@lambda-app/keycloak/users';
import { injectable } from 'tsyringe';

@injectable()
export class UserRoleMappingService {
  constructor(private integrationService: IntegrationService) {}

  public async getAllByRole(teamId: number, integrationId: number, environment: string, roleName: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await listRoleUsers(int, { environment, roleName });
  }

  public async manageRoleMapping(
    teamId: number,
    integrationId: number,
    environment: string,
    userName: string,
    roleName: string,
    operation: 'add' | 'del',
  ) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await manageUserRole(int, { environment, username: userName, roleName, mode: operation });
  }
}

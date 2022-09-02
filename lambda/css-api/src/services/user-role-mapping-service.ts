import { IntegrationService } from './integration-service';
import { listRoleUsers, listUserRoles, manageUserRole, manageUserRoles } from '@lambda-app/keycloak/users';
import { injectable } from 'tsyringe';

@injectable()
export class UserRoleMappingService {
  constructor(private integrationService: IntegrationService) {}

  public async getAllByRole(teamId: number, integrationId: number, environment: string, roleName: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await listRoleUsers(int, { environment, roleName });
  }

  public async getAllByUser(teamId: number, integrationId: number, environment: string, username: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await listUserRoles(int, { environment, username });
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

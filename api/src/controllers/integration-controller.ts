import { inject, injectable } from 'tsyringe';
import { IntegrationService } from '@/services/integration-service';
import { AuthContext } from '@/modules/authorization';
import { ACTIONS, RESOURCES } from '@/constants';

@injectable()
export class IntegrationController {
  private attributes = ['id', 'projectName', 'authType', 'environments', 'status', 'createdAt', 'updatedAt'];

  constructor(@inject('IntegrationService') private integrationService: IntegrationService) {}

  public async getIntegration(id: number, authz: AuthContext) {
    const int = await this.integrationService.getById(id, authz, {
      resource: RESOURCES.INTEGRATIONS,
      action: ACTIONS.READ,
    });
    return Object.fromEntries(Object.entries(int).filter(([prop]) => this.attributes.includes(prop)));
  }

  public async list(authz: AuthContext) {
    return await this.integrationService.listAccessible(authz, this.attributes);
  }
}

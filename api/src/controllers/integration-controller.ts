import { inject, injectable } from 'tsyringe';
import { IntegrationService } from '@/services/integration-service';

@injectable()
export class IntegrationController {
  private attributes = ['id', 'projectName', 'authType', 'environments', 'status', 'createdAt', 'updatedAt'];

  constructor(@inject('IntegrationService') private integrationService: IntegrationService) {}

  public async getIntegration(id: number, teamId: number) {
    const int = await this.integrationService.getById(id, teamId);
    return Object.fromEntries(Object.entries(int).filter(([prop]) => this.attributes.includes(prop)));
  }

  public async listByTeam(teamId: number) {
    return await this.integrationService.getAllByTeam(teamId, this.attributes);
  }
}

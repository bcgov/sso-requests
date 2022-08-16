import { injectable } from 'tsyringe';
import { IntegrationService } from '../services/IntegrationService';

@injectable()
export class IntegrationController {
  constructor(private integrationService: IntegrationService) {}

  public async getIntegration(id: number, teamId: number) {
    return await this.integrationService.getById(id, teamId);
  }

  public async listByTeam(teamId: number) {
    return await this.integrationService.getAllByTeam(teamId);
  }
}

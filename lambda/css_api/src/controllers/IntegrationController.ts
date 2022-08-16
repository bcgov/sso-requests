import { IntegrationService } from '../services/IntegrationService';

export class IntegrationController {
  private readonly integrationService: IntegrationService;

  constructor() {
    this.integrationService = new IntegrationService();
  }

  public async getIntegration(id: number, teamId: number) {
    return await this.integrationService.getById(id, teamId);
  }

  public async listByTeam(teamId: number) {
    return await this.integrationService.getAllByTeam(teamId);
  }
}

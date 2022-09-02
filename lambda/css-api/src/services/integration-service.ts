import { getIntegrationsByTeam, getIntegrationByIdAndTeam } from '@lambda-app/queries/request';
import { IntegrationData } from '@lambda-shared/interfaces';
import { injectable } from 'tsyringe';

@injectable()
export class IntegrationService {
  public async getAllByTeam(teamId: number, attributes?: string[]) {
    return await getIntegrationsByTeam(teamId, 'gold', attributes);
  }

  public async getById(id: number, teamId: number) {
    const int: IntegrationData = await getIntegrationByIdAndTeam(id, teamId);
    if (!int) throw Error(`integration #${id} not found`);
    return int;
  }
}

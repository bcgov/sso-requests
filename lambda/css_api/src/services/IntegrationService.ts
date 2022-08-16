import { getIntegrationsByTeam, getRequestById } from '@lambda-app/queries/request';
import { Data } from '@lambda-shared/interfaces';

export class IntegrationService {
  public async getAllByTeam(teamId: number) {
    return await getIntegrationsByTeam(teamId, 'gold');
  }

  public async getById(id: number, teamId: number) {
    const int: Data = await getRequestById(id);
    if (!int || teamId.toString() != int.teamId) throw Error(`integration #${id} not found`);
    return int;
  }
}

import { getIntegrationsByTeam, getRequestById } from '@lambda-app/queries/request';
import { Data } from '@lambda-shared/interfaces';
import { injectable } from 'tsyringe';

@injectable()
export class IntegrationService {
  public async getAllByTeam(teamId: number) {
    return await getIntegrationsByTeam(teamId, 'gold', [
      'id',
      'projectName',
      'protocol',
      'requester',
      'teamId',
      'environments',
      'createdAt',
      'updatedAt',
    ]);
  }

  public async getById(id: number, teamId: number, attributes?: string[]) {
    const int: Data = await getRequestById(id, attributes);
    if (!int || teamId.toString() != int.teamId) throw Error(`integration #${id} not found`);
    return int;
  }
}

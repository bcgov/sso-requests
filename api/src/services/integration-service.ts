import { getIntegrationsWhere, getUnscopedIntegrationById } from '@/sequelize/queries/requests';
import { injectable } from 'tsyringe';
import createHttpError from 'http-errors';
import { AuthContext, GrantRequirement, accessibleIntegrationsWhere, assertGrant } from '@/modules/authorization';
import { ACTIONS, RESOURCES } from '@/constants';

@injectable()
export class IntegrationService {
  public async listAccessible(authz: AuthContext, attributes?: string[]) {
    const scope = accessibleIntegrationsWhere(authz, {
      resource: RESOURCES.INTEGRATIONS,
      action: ACTIONS.READ,
    });
    if (!scope) return [];
    return await getIntegrationsWhere(scope, 'gold', attributes);
  }

  // The single authorization chokepoint for the API: every route that touches an
  // integration resolves it through here and must state what it intends to do.
  public async getById(id: number, authz: AuthContext, requirement: GrantRequirement) {
    const int: any = await getUnscopedIntegrationById(id);
    if (!int) throw new createHttpError[404](`integration #${id} not found`);
    assertGrant(authz, { id: int.id, teamId: int.teamId ?? null }, requirement);
    return int;
  }
}

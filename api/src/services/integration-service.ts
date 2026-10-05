import { getIntegrationsWhere, getUnscopedIntegrationById } from '@/sequelize/queries/requests';
import { injectable } from 'tsyringe';
import createHttpError from 'http-errors';
import { AuthContext, Requirement, accessibleIntegrationsWhere, assertPermitted } from '@/modules/authorization';
import { ACTIONS, RESOURCES } from '@sso/authz';

@injectable()
export class IntegrationService {
  public async listAccessible(authz: AuthContext, attributes?: string[]) {
    const scope = accessibleIntegrationsWhere(authz, {
      resource: RESOURCES.INTEGRATIONS,
      action: ACTIONS.READ,
    });
    // `null` means the account reaches nothing, which is an empty list rather
    // than an unfiltered query.
    if (!scope) return [];
    return await getIntegrationsWhere(scope, 'gold', attributes);
  }

  /**
   * The single authorization chokepoint for the API. Every route that touches
   * an integration resolves it through here and must say what it intends to do,
   * so the permission is named at the call site rather than implied by which
   * query was used.
   */
  public async getById(id: number, authz: AuthContext, requirement: Requirement) {
    const int: any = await getUnscopedIntegrationById(id);
    if (!int) throw new createHttpError[404](`integration #${id} not found`);
    assertPermitted(authz, { id: int.id, teamId: int.teamId ?? null }, requirement);
    return int;
  }
}

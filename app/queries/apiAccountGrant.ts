import { models } from '@app/shared/sequelize/models/models';
import { ALL_RESOURCE_ACTIONS } from '@app/shared/enums';

export interface GrantInput {
  teamId?: number | null;
  integrationId?: number | null;
  resource: string;
  action: string;
  environment?: string | null;
}

export const createGrants = async (apiAccountId: number, grants: GrantInput[], transaction?: any) => {
  if (grants.length === 0) return [];
  return models.apiAccountGrant.bulkCreate(
    grants.map((grant) => ({
      apiAccountId,
      teamId: grant.teamId ?? null,
      integrationId: grant.integrationId ?? null,
      resource: grant.resource,
      action: grant.action,
      environment: grant.environment ?? null,
    })),
    { transaction },
  );
};

// A team-scoped API account has unrestricted authority over its own team's
// integrations. Materializing that as real grant rows keeps enforcement to a
// single path rather than special-casing accounts that predate organizations.
export const createTeamWildcardGrants = async (apiAccountId: number, teamId: number, transaction?: any) =>
  createGrants(
    apiAccountId,
    ALL_RESOURCE_ACTIONS.map(([resource, action]) => ({ teamId, resource, action })),
    transaction,
  );

export const getGrantsForAccount = async (apiAccountId: number) =>
  models.apiAccountGrant.findAll({
    where: { apiAccountId },
    order: [
      ['resource', 'ASC'],
      ['action', 'ASC'],
    ],
    raw: true,
  });

export const deleteGrantsForAccount = async (apiAccountId: number, transaction?: any) =>
  models.apiAccountGrant.destroy({ where: { apiAccountId }, transaction });

import { models } from '@app/shared/sequelize/models/models';
import { Level } from '@app/shared/enums';

export interface GrantInput {
  teamId?: number | null;
  integrationId?: number | null;
  environment?: string | null;
  level: Level;
}

export const createGrants = async (apiAccountId: number, grants: GrantInput[], transaction?: any) => {
  if (grants.length === 0) return [];
  return models.apiAccountGrant.bulkCreate(
    grants.map((grant) => ({
      apiAccountId,
      teamId: grant.teamId ?? null,
      integrationId: grant.integrationId ?? null,
      environment: grant.environment ?? null,
      level: grant.level,
    })),
    { transaction },
  );
};

// A team-scoped API account has unrestricted authority over its own team's
// integrations. Materializing that as a real grant row keeps enforcement to a
// single path rather than special-casing accounts that predate organizations.
export const createTeamWildcardGrants = async (apiAccountId: number, teamId: number, transaction?: any) =>
  createGrants(apiAccountId, [{ teamId, level: 'editor' }], transaction);

export const getGrantsForAccount = async (apiAccountId: number) =>
  models.apiAccountGrant.findAll({
    where: { apiAccountId },
    order: [
      ['team_id', 'ASC'],
      ['integration_id', 'ASC'],
    ],
    raw: true,
  });

export const deleteGrantsForAccount = async (apiAccountId: number, transaction?: any) =>
  models.apiAccountGrant.destroy({ where: { apiAccountId }, transaction });

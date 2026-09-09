import { Op } from 'sequelize';
import { models } from '@app/shared/sequelize/models/models';
import { Level } from '@app/shared/enums';
import { resolveLevel, atOrBelow, highestLevel, lowerLevel } from '@app/utils/levels';

export interface CeilingInput {
  integrationId?: number | null;
  environment?: string | null;
  level: Level;
}

export interface GrantScope {
  teamId: number;
  integrationId?: number | null;
  environment?: string | null;
  level: Level;
}

export interface OrganizationAccess {
  organizationId: number;
  organizationRole: string;
  maximumLevel: Level;
  defaultLevel: Level;
  effectiveLevel: Level;
  environmentLevels: Record<string, Level>;
}

const organizationRoleMaximum: Record<string, Level> = {
  member: 'viewer',
  admin: 'editor',
};

const plain = (value: any) => (value?.get ? value.get({ plain: true }) : value);

export const buildOrganizationAccess = ({
  organizationId,
  organizationRole,
  integrationId,
  environments,
  ceilings,
}: {
  organizationId: number;
  organizationRole: string;
  integrationId: number;
  environments: string[];
  ceilings: CeilingInput[];
}): OrganizationAccess => {
  const maximumLevel = organizationRoleMaximum[organizationRole] ?? 'none';
  const defaultLevel = lowerLevel(resolveLevel(ceilings, { integrationId }), maximumLevel);
  const environmentLevels = Object.fromEntries(
    environments.map((environment) => [
      environment,
      lowerLevel(resolveLevel(ceilings, { integrationId, environment }), maximumLevel),
    ]),
  );
  const scopedLevels = environments.length > 0 ? Object.values(environmentLevels) : [defaultLevel];

  return {
    organizationId,
    organizationRole,
    maximumLevel,
    defaultLevel,
    effectiveLevel: highestLevel(scopedLevels),
    environmentLevels,
  };
};

export const getOrganizationAccessForIntegrations = async (
  userId: number,
  integrations: any[],
): Promise<Map<number, OrganizationAccess>> => {
  const teamIntegrations = integrations.map(plain).filter((integration) => integration.usesTeam && integration.teamId);
  if (teamIntegrations.length === 0) return new Map();

  const memberships = await models.organizationMember.findAll({
    where: { userId, pending: false },
    attributes: ['organizationId', 'role'],
    raw: true,
  });
  if (memberships.length === 0) return new Map();

  const membershipsByOrganization = new Map(
    memberships.map((membership: any) => [membership.organizationId, membership]),
  );
  const links = await models.organizationTeam.findAll({
    where: {
      teamId: { [Op.in]: Array.from(new Set(teamIntegrations.map((integration) => integration.teamId))) },
      organizationId: { [Op.in]: Array.from(membershipsByOrganization.keys()) },
      pending: false,
    },
    raw: true,
  });
  if (links.length === 0) return new Map();

  const ceilings = await models.organizationTeamCeiling.findAll({
    where: { organizationTeamId: { [Op.in]: links.map((link: any) => link.id) } },
    raw: true,
  });
  const linksByTeam = new Map(links.map((link: any) => [link.teamId, link]));
  const accessByIntegration = new Map<number, OrganizationAccess>();

  for (const integration of teamIntegrations) {
    const link: any = linksByTeam.get(integration.teamId);
    if (!link) continue;
    const membership: any = membershipsByOrganization.get(link.organizationId);
    if (!membership) continue;

    accessByIntegration.set(
      integration.id,
      buildOrganizationAccess({
        organizationId: link.organizationId,
        organizationRole: membership.role,
        integrationId: integration.id,
        environments: integration.environments ?? [],
        ceilings: ceilings.filter((ceiling: any) => ceiling.organizationTeamId === link.id),
      }),
    );
  }

  return accessByIntegration;
};

export const getOrganizationAccessForIntegration = async (userId: number, integration: any) =>
  (await getOrganizationAccessForIntegrations(userId, [integration])).get(plain(integration).id);

export const getOrganizationTeamIdsForUser = async (userId: number): Promise<number[]> => {
  const memberships = await models.organizationMember.findAll({
    where: { userId, pending: false },
    attributes: ['organizationId'],
    raw: true,
  });
  if (memberships.length === 0) return [];

  const links = await models.organizationTeam.findAll({
    where: {
      organizationId: { [Op.in]: memberships.map((membership: any) => membership.organizationId) },
      pending: false,
    },
    attributes: ['teamId'],
    raw: true,
  });
  return Array.from(new Set(links.map((link: any) => link.teamId)));
};

export const getOrganizationById = async (organizationId: number) =>
  models.organization.findOne({ where: { id: organizationId } });

export const getOrganizationMember = async (organizationId: number, userId: number) =>
  models.organizationMember.findOne({ where: { organizationId, userId }, raw: true });

export const getOrganizationsForUser = async (userId: number) =>
  models.organization.findAll({
    include: [
      {
        model: models.organizationMember,
        where: { userId, pending: false },
        attributes: ['role', 'pending'],
      },
    ],
  });

export const getOrganizationTeamLink = async (organizationId: number, teamId: number) =>
  models.organizationTeam.findOne({ where: { organizationId, teamId } });

// A team may sit on several invitations at once but can only have accepted one,
// so this is what "the organization a team belongs to" means.
export const getActiveLinkForTeam = async (teamId: number) =>
  models.organizationTeam.findOne({ where: { teamId, pending: false } });

export const getLinksForTeam = async (teamId: number) =>
  models.organizationTeam.findAll({
    where: { teamId },
    include: [{ model: models.organization, attributes: ['id', 'name', 'description'] }],
  });

export const getCeilings = async (organizationTeamId: number) =>
  models.organizationTeamCeiling.findAll({
    where: { organizationTeamId },
    order: [['integration_id', 'ASC']],
    raw: true,
  });

export const replaceCeilings = async (organizationTeamId: number, ceilings: CeilingInput[], transaction?: any) => {
  await models.organizationTeamCeiling.destroy({ where: { organizationTeamId }, transaction });
  if (ceilings.length === 0) return [];
  return models.organizationTeamCeiling.bulkCreate(
    ceilings.map((ceiling) => ({
      organizationTeamId,
      integrationId: ceiling.integrationId ?? null,
      environment: ceiling.environment ?? null,
      level: ceiling.level,
    })),
    { transaction },
  );
};

export const fullCeiling = (): CeilingInput[] => [{ level: 'editor' }];

// A grant may not exceed what the team consented to for the same target. The
// ceiling is resolved by specificity first, so an integration the team carved
// down to `none` bounds the grant even when the team-wide ceiling is higher.
export const isWithinCeiling = (grant: GrantScope, ceilings: CeilingInput[]) =>
  atOrBelow(
    grant.level,
    resolveLevel(ceilings, { integrationId: grant.integrationId ?? null, environment: grant.environment ?? null }),
  );

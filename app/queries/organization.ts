import { Op } from 'sequelize';
import { Permission } from '@sso/authz';
import { models } from '@app/shared/sequelize/models/models';

export interface OverrideInput {
  requestId: number;
  permissions: Permission[];
}

export const getOrganizationRolesForUser = async (userId: number): Promise<Map<number, string>> => {
  const memberships = await models.organizationMember.findAll({
    where: { userId },
    attributes: ['organizationId', 'role'],
    raw: true,
  });
  return new Map(memberships.map((row: { organizationId: number; role: string }) => [row.organizationId, row.role]));
};

export const getOrganizationById = async (organizationId: number) =>
  models.organization.findOne({ where: { id: organizationId } });

export const getOrganizationMember = async (organizationId: number, userId: number) =>
  models.organizationMember.findOne({ where: { organizationId, userId }, raw: true });

export const getOrganizationsForUser = async (userId: number) => {
  const roleByOrganization = await getOrganizationRolesForUser(userId);
  if (roleByOrganization.size === 0) return [];

  const organizations = await models.organization.findAll({
    where: { id: { [Op.in]: Array.from(roleByOrganization.keys()) } },
    order: [['name', 'ASC']],
    raw: true,
  });

  return organizations.map((organization: any) => ({
    ...organization,
    role: roleByOrganization.get(organization.id) ?? null,
  }));
};

export const getOrganizationTeamLink = async (organizationId: number, teamId: number) =>
  models.organizationTeam.findOne({ where: { organizationId, teamId } });

// A team may sit on several invitations at once but can have accepted only one,
// so this is what "the organization a team belongs to" means.
export const getActiveLinkForTeam = async (teamId: number) =>
  models.organizationTeam.findOne({ where: { teamId, pending: false } });

export const getLinksForTeam = async (teamId: number) =>
  models.organizationTeam.findAll({
    where: { teamId },
    include: [{ model: models.organization, attributes: ['id', 'name', 'description'] }],
    order: [['id', 'ASC']],
  });

export const getLinksForOrganization = async (organizationId: number) =>
  models.organizationTeam.findAll({
    where: { organizationId },
    include: [{ model: models.team, attributes: ['id', 'name'] }],
    order: [['id', 'ASC']],
  });

export const findActiveLinks = async (userId: number, teamIds?: number[]) => {
  if (teamIds && teamIds.length === 0) return [];

  const roleByOrganization = await getOrganizationRolesForUser(userId);
  if (roleByOrganization.size === 0) return [];

  const where: any = {
    organizationId: { [Op.in]: Array.from(roleByOrganization.keys()) },
    pending: false,
  };
  if (teamIds) where.teamId = { [Op.in]: teamIds };

  return models.organizationTeam.findAll({
    where,
    attributes: ['id', 'organizationId', 'teamId', 'permissions'],
    raw: true,
  });
};

export const getOverrides = async (organizationTeamId: number) =>
  models.organizationIntegrationOverride.findAll({
    where: { organizationTeamId },
    order: [['request_id', 'ASC']],
    raw: true,
  });

export const getOverridesByLink = async (organizationTeamIds: number[]): Promise<Map<number, any[]>> => {
  const byLink = new Map<number, any[]>(organizationTeamIds.map((id) => [id, []]));
  if (organizationTeamIds.length === 0) return byLink;

  const rows = await models.organizationIntegrationOverride.findAll({
    where: { organizationTeamId: { [Op.in]: organizationTeamIds } },
    order: [['request_id', 'ASC']],
    raw: true,
  });

  for (const row of rows) byLink.get((row as any).organizationTeamId)?.push(row);
  return byLink;
};

export const replaceOverrides = async (organizationTeamId: number, overrides: OverrideInput[], transaction?: any) => {
  await models.organizationIntegrationOverride.destroy({ where: { organizationTeamId }, transaction });
  if (overrides.length === 0) return [];
  return models.organizationIntegrationOverride.bulkCreate(
    overrides.map((override) => ({
      organizationTeamId,
      requestId: override.requestId,
      permissions: override.permissions,
    })),
    { transaction },
  );
};

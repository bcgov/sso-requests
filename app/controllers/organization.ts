import createHttpError from 'http-errors';
import { Op } from 'sequelize';
import { Permission, TEAM_SCOPED_PERMISSIONS, isSubset, isValidPermissionSet, sortPermissions } from '@sso/authz';
import { sequelize, models } from '@app/shared/sequelize/models/models';
import { Session } from '@app/shared/interfaces';
import { EVENTS } from '@app/shared/enums';
import { getDisplayName } from '@app/utils/helpers';
import { lowcase } from '@app/helpers/string';
import { appPermissions, hasAppPermission, organizationPermissions, teamPermissions } from '@app/utils/authorize';
import { processIntegrationRequest, checkIfRequestMerged } from '@app/controllers/requests';
import { createEvent } from '@app/queries/event';
import { generateInstallation, updateClientSecret } from '@app/keycloak/installation';
import { authorizeTeam } from '@app/queries/teamAccess';
import { authorizeOrganization } from '@app/queries/organizationAccess';
import {
  OverrideInput,
  getActiveLinkForTeam,
  getLinksForOrganization,
  getLinksForTeam,
  getOrganizationById,
  getOrganizationTeamLink,
  getOrganizationsForUser,
  getOverrides,
  getOverridesByLink,
  replaceOverrides,
} from '@app/queries/organization';

const isCssAdmin = (session: Session) => hasAppPermission(session?.client_roles, appPermissions.MANAGE_ORGANIZATIONS);

const assertOrganization = async (session: Session, organizationId: number, permission: string) => {
  const authorized = await authorizeOrganization(session, organizationId, permission);
  if (!authorized) throw new createHttpError.Forbidden('not allowed to manage this organization');
  return authorized.organization;
};

const assertTeamAdmin = async (session: Session, teamId: number) => {
  const authorized = await authorizeTeam(session, teamId, teamPermissions.UPDATE_TEAM);
  if (!authorized) throw new createHttpError.Forbidden(`not allowed to manage team #${teamId}`);
  return authorized.team;
};

const orgEvent = (session: Session, organizationId: number, eventCode: string, details?: any) =>
  createEvent({
    eventCode,
    organizationId,
    idirUserid: session?.idir_userid,
    idirUserDisplayName: getDisplayName(session),
    details,
  });

const validateConsent = (permissions: unknown): Permission[] => {
  if (!isValidPermissionSet(permissions)) {
    throw new createHttpError.BadRequest(`unknown permission in ${JSON.stringify(permissions)}`);
  }
  if (!isSubset(permissions, TEAM_SCOPED_PERMISSIONS)) {
    throw new createHttpError.BadRequest('a team cannot consent to an administrative permission');
  }
  return sortPermissions(permissions);
};

const validateOverrides = async (teamId: number, overrides: any[]): Promise<OverrideInput[]> => {
  if (!Array.isArray(overrides)) throw new createHttpError.BadRequest('overrides must be a list');

  const validated = overrides.map((override) => ({
    requestId: Number(override?.requestId),
    permissions: validateConsent(override?.permissions),
  }));

  const requestIds = validated.map((override) => override.requestId);
  if (requestIds.some((id) => !Number.isInteger(id))) {
    throw new createHttpError.BadRequest('each override must name an integration');
  }
  if (new Set(requestIds).size !== requestIds.length) {
    throw new createHttpError.BadRequest('duplicate integration in overrides');
  }

  if (requestIds.length > 0) {
    const owned = await models.request.count({
      where: { id: { [Op.in]: requestIds }, teamId, apiServiceAccount: false },
    });
    if (owned !== requestIds.length) {
      throw new createHttpError.BadRequest(`every override must name an integration owned by team #${teamId}`);
    }
  }

  return validated;
};

const linkView = (link: any, overrides: any[]) => ({
  ...(link.get ? link.get({ plain: true }) : link),
  overrides,
});

export const listOrganizations = async (session: Session) => {
  if (isCssAdmin(session)) {
    return models.organization.findAll({ order: [['name', 'ASC']], raw: true });
  }
  return getOrganizationsForUser(session?.user?.id as number);
};

export const createOrganization = async (session: Session, data: { name: string; description?: string }) => {
  if (!isCssAdmin(session)) throw new createHttpError.Forbidden('not allowed to create organizations');
  if (!data?.name?.trim()) throw new createHttpError.BadRequest('organization name is required');

  const organization = await models.organization.create({
    name: data.name.trim(),
    description: data.description?.trim() || null,
  });

  orgEvent(session, organization.id, EVENTS.ORGANIZATION_CREATE_SUCCESS, { name: organization.name });
  return organization;
};

export const getOrganization = async (session: Session, organizationId: number) =>
  assertOrganization(session, organizationId, organizationPermissions.VIEW_ORGANIZATION);

export const updateOrganization = async (
  session: Session,
  organizationId: number,
  data: { name?: string; description?: string },
) => {
  const organization = await assertOrganization(session, organizationId, organizationPermissions.UPDATE_ORGANIZATION);
  if (data.name !== undefined) organization.name = data.name.trim();
  if (data.description !== undefined) organization.description = data.description?.trim() || null;
  const saved = await organization.save();
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_UPDATE_SUCCESS, { name: saved.name });
  return saved;
};

export const deleteOrganization = async (session: Session, organizationId: number) => {
  if (!isCssAdmin(session)) throw new createHttpError.Forbidden('not allowed to delete organizations');
  const organization = await getOrganizationById(organizationId);
  if (!organization) throw new createHttpError.NotFound('organization not found');

  await sequelize.transaction(async (transaction: any) => {
    const activeAccount = await models.request.findOne({
      where: { organizationId, apiServiceAccount: true, archived: false },
      attributes: ['id'],
      transaction,
    });
    if (activeAccount) throw new createHttpError.Conflict('organization still has active api accounts');

    // Archived account requests are audit records and must outlive the organization.
    await models.request.update(
      { organizationId: null },
      { where: { organizationId, apiServiceAccount: true, archived: true }, transaction },
    );
    await organization.destroy({ transaction });
  });

  orgEvent(session, organizationId, EVENTS.ORGANIZATION_DELETE_SUCCESS, { name: organization.name });
  return { success: true };
};

export const listOrganizationMembers = async (session: Session, organizationId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.VIEW_ORGANIZATION);
  return models.organizationMember.findAll({
    where: { organizationId },
    include: [{ model: models.user, attributes: ['id', 'idirEmail', 'displayName'] }],
  });
};

export const addOrganizationMember = async (
  session: Session,
  organizationId: number,
  data: { idirEmail: string; role: string },
) => {
  await assertOrganization(session, organizationId, organizationPermissions.ADD_ORG_MEMBER);
  if (!['admin', 'member'].includes(data.role)) throw new createHttpError.BadRequest('invalid role');

  const user = await models.user.findOne({ where: { idirEmail: lowcase(data.idirEmail) } });
  if (!user) throw new createHttpError.NotFound(`no user found for ${data.idirEmail}`);

  const [member] = await models.organizationMember.findOrCreate({
    where: { organizationId, userId: user.id },
    defaults: { organizationId, userId: user.id, role: data.role },
  });

  orgEvent(session, organizationId, EVENTS.ORGANIZATION_MEMBER_ADDED, { userId: user.id, role: data.role });
  return member;
};

export const updateOrganizationMemberRole = async (
  session: Session,
  organizationId: number,
  userId: number,
  role: string,
) => {
  await assertOrganization(session, organizationId, organizationPermissions.UPDATE_ORG_MEMBER_ROLE);
  if (!['admin', 'member'].includes(role)) throw new createHttpError.BadRequest('invalid role');

  const member = await models.organizationMember.findOne({ where: { organizationId, userId } });
  if (!member) throw new createHttpError.NotFound('member not found');

  member.role = role;
  const saved = await member.save();
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_MEMBER_ROLE_UPDATED, { userId, role });
  return saved;
};

export const removeOrganizationMember = async (session: Session, organizationId: number, userId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.REMOVE_ORG_MEMBER);
  await models.organizationMember.destroy({ where: { organizationId, userId } });
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_MEMBER_REMOVED, { userId });
  return { success: true };
};

export const listOrganizationTeams = async (session: Session, organizationId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.VIEW_ORGANIZATION);
  const links = await getLinksForOrganization(organizationId);
  const overridesByLink = await getOverridesByLink(links.map((link: any) => link.id));
  return links.map((link: any) => linkView(link, overridesByLink.get(link.id) ?? []));
};

export const inviteTeam = async (
  session: Session,
  organizationId: number,
  data: { teamId: number; permissions?: Permission[] },
) => {
  await assertOrganization(session, organizationId, organizationPermissions.INVITE_TEAM);

  const team = await models.team.findOne({ where: { id: data.teamId } });
  if (!team) throw new createHttpError.NotFound(`team #${data.teamId} not found`);

  const activeLink = await getActiveLinkForTeam(data.teamId);
  if (activeLink) {
    throw new createHttpError.Conflict(
      activeLink.organizationId === organizationId
        ? 'team is already in this organization'
        : 'team already belongs to another organization',
    );
  }

  const permissions = validateConsent(data.permissions ?? []);
  const existing = await getOrganizationTeamLink(organizationId, data.teamId);

  if (existing) {
    existing.permissions = permissions;
    existing.invitedBy = session.user!.id;
    await existing.save();
  }

  const link =
    existing ||
    (await models.organizationTeam.create({
      organizationId,
      teamId: data.teamId,
      permissions,
      pending: true,
      invitedBy: session.user!.id,
    }));

  orgEvent(session, organizationId, EVENTS.ORGANIZATION_TEAM_INVITED, { teamId: data.teamId, permissions });
  return link;
};

export const removeTeamFromOrganization = async (session: Session, organizationId: number, teamId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.REMOVE_TEAM);
  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link) throw new createHttpError.NotFound('team is not linked to this organization');
  await link.destroy();
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_TEAM_LEFT, { teamId, removedBy: 'organization' });
  return { success: true };
};

export const listTeamOrganizationLinks = async (session: Session, teamId: number) => {
  await assertTeamAdmin(session, teamId);
  const links = await getLinksForTeam(teamId);
  const overridesByLink = await getOverridesByLink(links.map((link: any) => link.id));
  return links.map((link: any) => linkView(link, overridesByLink.get(link.id) ?? []));
};

export const respondToOrganizationInvitation = async (
  session: Session,
  teamId: number,
  organizationId: number,
  data: { accept: boolean; permissions?: Permission[] },
) => {
  await assertTeamAdmin(session, teamId);

  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link || !link.pending) throw new createHttpError.NotFound('no pending invitation');

  if (!data.accept) {
    await link.destroy();
    orgEvent(session, organizationId, EVENTS.ORGANIZATION_TEAM_DECLINED, { teamId });
    return { success: true, accepted: false };
  }

  const activeLink = await getActiveLinkForTeam(teamId);
  if (activeLink) throw new createHttpError.Conflict('team already belongs to an organization');

  // A team may accept on narrower terms than were proposed, but never broader.
  if (data.permissions) {
    const accepted = validateConsent(data.permissions);
    if (!isSubset(accepted, link.permissions)) {
      throw new createHttpError.BadRequest('cannot accept broader terms than were offered');
    }
    link.permissions = accepted;
  }

  link.pending = false;
  const saved = await link.save();
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_TEAM_JOINED, { teamId, permissions: saved.permissions });
  return { success: true, accepted: true, link: saved };
};

export const updateTeamConsent = async (
  session: Session,
  teamId: number,
  organizationId: number,
  permissions: Permission[],
) => {
  await assertTeamAdmin(session, teamId);
  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link || link.pending) throw new createHttpError.NotFound('team is not in this organization');

  link.permissions = validateConsent(permissions);
  const saved = await link.save();
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_CONSENT_UPDATED, { teamId, permissions: saved.permissions });
  return saved;
};

export const updateIntegrationOverrides = async (
  session: Session,
  teamId: number,
  organizationId: number,
  overrides: any[],
) => {
  await assertTeamAdmin(session, teamId);
  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link || link.pending) throw new createHttpError.NotFound('team is not in this organization');

  await replaceOverrides(link.id, await validateOverrides(teamId, overrides));
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_OVERRIDES_UPDATED, { teamId, count: overrides.length });
  return getOverrides(link.id);
};

export const leaveOrganization = async (session: Session, teamId: number, organizationId: number) => {
  await assertTeamAdmin(session, teamId);
  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link) throw new createHttpError.NotFound('team is not linked to this organization');
  await link.destroy();
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_TEAM_LEFT, { teamId, removedBy: 'team' });
  return { success: true };
};

const API_ACCOUNT_ATTRIBUTES = [
  'id',
  'clientId',
  'organizationId',
  'status',
  'updatedAt',
  'prNumber',
  'archived',
  'requester',
  'serviceType',
  'authType',
];

export const listOrganizationApiAccounts = async (session: Session, organizationId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.VIEW_ORGANIZATION);
  return models.request.findAll({
    where: { organizationId, apiServiceAccount: true, archived: false },
    attributes: API_ACCOUNT_ATTRIBUTES,
    raw: true,
  });
};

const getOrganizationApiAccount = async (organizationId: number, accountId: number) => {
  const account = await models.request.findOne({
    where: { id: accountId, organizationId, apiServiceAccount: true },
  });
  if (!account) throw new createHttpError.NotFound('could not find api account');
  return account;
};

export const createOrganizationApiAccount = async (session: Session, organizationId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);

  const requester = getDisplayName(session);
  const account = await models.request.create({
    projectName: `Service Account for organization #${organizationId}`,
    serviceType: 'gold',
    usesTeam: false,
    organizationId,
    apiServiceAccount: true,
    authType: 'service-account',
    status: 'submitted',
    requester,
    environments: ['prod'],
  });

  account.clientId = `service-account-org-${organizationId}-${account.id}`;
  const saved = await account.save();

  // Service account creation stays synchronous: the caller reads the client credentials right after.
  await processIntegrationRequest(saved, false, '', false, { awaitCompletion: true });

  orgEvent(session, organizationId, EVENTS.REQUEST_CREATE_SUCCESS, { apiAccountId: saved.id });
  return saved;
};

export const getOrganizationApiAccountCredentials = async (
  session: Session,
  organizationId: number,
  accountId: number,
) => {
  await assertOrganization(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
  const account = await getOrganizationApiAccount(organizationId, accountId);
  return generateInstallation({
    serviceType: account.serviceType,
    environment: 'prod',
    realmName: 'standard',
    clientId: account.clientId,
    authType: account.authType,
  });
};

export const updateOrganizationApiAccountSecret = async (
  session: Session,
  organizationId: number,
  accountId: number,
) => {
  await assertOrganization(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
  const account = await getOrganizationApiAccount(organizationId, accountId);
  return updateClientSecret({
    serviceType: account.serviceType,
    environment: 'prod',
    realmName: 'standard',
    clientId: account.clientId,
  });
};

export const deleteOrganizationApiAccount = async (session: Session, organizationId: number, accountId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
  const account = await getOrganizationApiAccount(organizationId, accountId);
  const isMerged = await checkIfRequestMerged(accountId);

  account.requester = getDisplayName(session);
  account.status = 'submitted';
  account.archived = true;
  account.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
  const saved = await account.save();

  if (isMerged) {
    // Trigger workflow with empty environments to delete client
    await processIntegrationRequest(saved, false, '', false, { awaitCompletion: true });
  }

  createEvent({
    eventCode: EVENTS.TEAM_API_ACCOUNT_DELETE_SUCCESS,
    requestId: accountId,
    organizationId,
    idirUserid: session?.idir_userid,
    idirUserDisplayName: session.user?.displayName,
  });

  return saved;
};

export const searchTeams = async (session: Session, organizationId: number, query: string) => {
  await assertOrganization(session, organizationId, organizationPermissions.INVITE_TEAM);

  const trimmed = (query || '').trim();
  const where: any = trimmed
    ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${trimmed}%` } },
          ...(/^\d+$/.test(trimmed) ? [{ id: Number(trimmed) }] : []),
        ],
      }
    : {};

  const teams = await models.team.findAll({
    where,
    attributes: ['id', 'name'],
    order: [['name', 'ASC']],
    limit: 25,
    raw: true,
  });

  const links = await models.organizationTeam.findAll({
    where: { teamId: { [Op.in]: teams.map((team: any) => team.id) } },
    attributes: ['teamId', 'organizationId', 'pending'],
    raw: true,
  });

  return teams.map((team: any) => {
    const link = links.find((candidate: any) => candidate.teamId === team.id);
    return {
      ...team,
      organizationId: link?.organizationId ?? null,
      pending: link?.pending ?? null,
      available: !link || link.pending || link.organizationId === organizationId,
    };
  });
};

export const listTeamIntegrations = async (session: Session, organizationId: number, teamId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.INVITE_TEAM);

  return models.request.findAll({
    where: { teamId, apiServiceAccount: false, archived: false },
    attributes: ['id', 'projectName', 'clientId', 'status', 'environments', 'protocol', 'authType'],
    order: [['id', 'ASC']],
    raw: true,
  });
};

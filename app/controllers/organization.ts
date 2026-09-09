import createHttpError from 'http-errors';
import { Op } from 'sequelize';
import { sequelize, models } from '@app/shared/sequelize/models/models';
import { Session } from '@app/shared/interfaces';
import { EVENTS, isValidLevel } from '@app/shared/enums';
import { getDisplayName } from '@app/utils/helpers';
import { lowcase } from '@app/helpers/string';
import {
  appPermissions,
  hasAppPermission,
  hasOrganizationPermission,
  hasTeamPermission,
  organizationPermissions,
  teamPermissions,
} from '@app/utils/authorize';
import { processIntegrationRequest, checkIfRequestMerged, createEvent } from '@app/controllers/requests';
import { generateInstallation, updateClientSecret } from '../keycloak/installation';
import { getTeamRoleByUserId } from '@app/queries/team';
import { createGrants, deleteGrantsForAccount, getGrantsForAccount, GrantInput } from '@app/queries/apiAccountGrant';
import {
  CeilingInput,
  fullCeiling,
  getActiveLinkForTeam,
  getCeilings,
  getLinksForTeam,
  getOrganizationById,
  getOrganizationMember,
  getOrganizationTeamLink,
  isWithinCeiling,
  replaceCeilings,
} from '@app/queries/organization';

const isCssAdmin = (session: Session) => hasAppPermission(session?.client_roles, appPermissions.MANAGE_ORGANIZATIONS);

// CSS admins are treated as admins of every organization so that they can
// unpick a misconfigured one, but they are still bound by the team ceilings.
const assertOrgPermission = async (session: Session, organizationId: number, permission: string) => {
  const organization = await getOrganizationById(organizationId);
  if (!organization) throw new createHttpError.NotFound('organization not found');
  if (isCssAdmin(session)) return organization;

  const member = await getOrganizationMember(organizationId, session.user!.id);
  if (!member || member.pending || !hasOrganizationPermission(member.role, permission)) {
    throw new createHttpError.Forbidden('not allowed to manage this organization');
  }
  return organization;
};

const assertTeamAdmin = async (session: Session, teamId: number) => {
  const userRole = await getTeamRoleByUserId(session.user!.id, teamId);
  if (userRole?.pending || !hasTeamPermission(userRole?.role, teamPermissions.UPDATE_TEAM)) {
    throw new createHttpError.Forbidden(`not allowed to manage team #${teamId}`);
  }
};

const orgEvent = (session: Session, organizationId: number, eventCode: string, details?: any) =>
  createEvent({
    eventCode,
    organizationId,
    idirUserid: session?.idir_userid,
    idirUserDisplayName: getDisplayName(session),
    details,
  });

export const listOrganizations = async (session: Session) => {
  if (isCssAdmin(session)) {
    return models.organization.findAll({ order: [['name', 'ASC']], raw: true });
  }

  const memberships = await models.organizationMember.findAll({
    where: { userId: session.user!.id, pending: false },
    attributes: ['organizationId', 'role'],
    raw: true,
  });

  if (memberships.length === 0) return [];

  const organizations = await models.organization.findAll({
    where: { id: { [Op.in]: memberships.map((m: any) => m.organizationId) } },
    order: [['name', 'ASC']],
    raw: true,
  });

  return organizations.map((organization: any) => ({
    ...organization,
    role: memberships.find((membership: any) => membership.organizationId === organization.id)?.role,
  }));
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

export const getOrganization = async (session: Session, organizationId: number) => {
  const organization = await assertOrgPermission(session, organizationId, organizationPermissions.VIEW_ORGANIZATION);
  return organization;
};

export const updateOrganization = async (
  session: Session,
  organizationId: number,
  data: { name?: string; description?: string },
) => {
  const organization = await assertOrgPermission(session, organizationId, organizationPermissions.UPDATE_ORGANIZATION);
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
    if (activeAccount) {
      throw new createHttpError.Conflict('organization still has active api accounts');
    }

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
  await assertOrgPermission(session, organizationId, organizationPermissions.VIEW_ORGANIZATION);
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
  await assertOrgPermission(session, organizationId, organizationPermissions.ADD_ORG_MEMBER);
  if (!['admin', 'member'].includes(data.role)) throw new createHttpError.BadRequest('invalid role');

  const email = lowcase(data.idirEmail);
  const user = await models.user.findOne({ where: { idirEmail: email } });
  if (!user) throw new createHttpError.NotFound(`no user found for ${data.idirEmail}`);

  const [member] = await models.organizationMember.findOrCreate({
    where: { organizationId, userId: user.id },
    defaults: { organizationId, userId: user.id, role: data.role, pending: false },
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
  await assertOrgPermission(session, organizationId, organizationPermissions.UPDATE_ORG_MEMBER_ROLE);
  if (!['admin', 'member'].includes(role)) throw new createHttpError.BadRequest('invalid role');

  const member = await models.organizationMember.findOne({ where: { organizationId, userId } });
  if (!member) throw new createHttpError.NotFound('member not found');

  member.role = role;
  const saved = await member.save();
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_MEMBER_ROLE_UPDATED, { userId, role });
  return saved;
};

export const removeOrganizationMember = async (session: Session, organizationId: number, userId: number) => {
  await assertOrgPermission(session, organizationId, organizationPermissions.REMOVE_ORG_MEMBER);
  await models.organizationMember.destroy({ where: { organizationId, userId } });
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_MEMBER_REMOVED, { userId });
  return { success: true };
};

export const listOrganizationTeams = async (session: Session, organizationId: number) => {
  await assertOrgPermission(session, organizationId, organizationPermissions.VIEW_ORGANIZATION);
  const links = await models.organizationTeam.findAll({
    where: { organizationId },
    include: [{ model: models.team, attributes: ['id', 'name'] }],
    order: [['id', 'ASC']],
  });

  return Promise.all(
    links.map(async (link: any) => ({
      ...link.get({ plain: true }),
      ceilings: await getCeilings(link.id),
    })),
  );
};

// The organization proposes a ceiling; nothing is in force until a team admin
// accepts it, which is what keeps one team from being conscripted by another.
export const inviteTeam = async (
  session: Session,
  organizationId: number,
  data: { teamId: number; ceilings?: CeilingInput[] },
) => {
  await assertOrgPermission(session, organizationId, organizationPermissions.INVITE_TEAM);

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

  const existing = await getOrganizationTeamLink(organizationId, data.teamId);
  const link =
    existing ||
    (await models.organizationTeam.create({
      organizationId,
      teamId: data.teamId,
      pending: true,
      invitedBy: session.user!.id,
    }));

  await replaceCeilings(link.id, validateCeilings(data.ceilings ?? fullCeiling()));

  orgEvent(session, organizationId, EVENTS.ORGANIZATION_TEAM_INVITED, { teamId: data.teamId });
  return link;
};

const validateCeilings = (ceilings: CeilingInput[]): CeilingInput[] => {
  for (const ceiling of ceilings) {
    if (!isValidLevel(ceiling.level)) {
      throw new createHttpError.BadRequest(`unknown permission level ${ceiling.level}`);
    }
    if (ceiling.environment && !['dev', 'test', 'prod'].includes(ceiling.environment)) {
      throw new createHttpError.BadRequest('invalid environment');
    }
  }
  return ceilings;
};

// Removing a team from the org side and a team leaving from its own side are
// the same operation: the link row is the only thing holding the ceiling up.
export const removeTeamFromOrganization = async (session: Session, organizationId: number, teamId: number) => {
  await assertOrgPermission(session, organizationId, organizationPermissions.REMOVE_TEAM);
  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link) throw new createHttpError.NotFound('team is not linked to this organization');
  await link.destroy();
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_TEAM_LEFT, { teamId, removedBy: 'organization' });
  return { success: true };
};

export const listTeamOrganizationLinks = async (session: Session, teamId: number) => {
  await assertTeamAdmin(session, teamId);
  const links = await getLinksForTeam(teamId);
  return Promise.all(
    links.map(async (link: any) => ({
      ...link.get({ plain: true }),
      ceilings: await getCeilings(link.id),
    })),
  );
};

export const respondToOrganizationInvitation = async (
  session: Session,
  teamId: number,
  organizationId: number,
  data: { accept: boolean; ceilings?: CeilingInput[] },
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

  // A team may accept on narrower terms than were proposed, but never broader:
  // the proposal is the ceiling on the ceiling.
  if (data.ceilings) {
    const proposed = await getCeilings(link.id);
    for (const ceiling of validateCeilings(data.ceilings)) {
      const scope = { teamId, ...ceiling };
      if (!isWithinCeiling(scope, proposed)) {
        throw new createHttpError.BadRequest('cannot accept broader terms than were offered');
      }
    }
    await replaceCeilings(link.id, data.ceilings);
  }

  link.pending = false;
  const saved = await link.save();
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_TEAM_JOINED, { teamId });
  return { success: true, accepted: true, link: saved };
};

// Narrowing a ceiling takes effect on the next API request without touching a
// single grant, because effective permission is grant ∩ ceiling.
export const updateTeamCeiling = async (
  session: Session,
  teamId: number,
  organizationId: number,
  ceilings: CeilingInput[],
) => {
  await assertTeamAdmin(session, teamId);
  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link || link.pending) throw new createHttpError.NotFound('team is not in this organization');

  await replaceCeilings(link.id, validateCeilings(ceilings));
  orgEvent(session, organizationId, EVENTS.ORGANIZATION_CEILING_UPDATED, { teamId });
  return getCeilings(link.id);
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
  await assertOrgPermission(session, organizationId, organizationPermissions.VIEW_ORGANIZATION);
  const accounts = await models.request.findAll({
    where: { organizationId, apiServiceAccount: true },
    attributes: API_ACCOUNT_ATTRIBUTES,
    raw: true,
  });

  return Promise.all(
    accounts.map(async (account: any) => ({ ...account, grants: await getGrantsForAccount(account.id) })),
  );
};

const getOrganizationApiAccount = async (organizationId: number, accountId: number) => {
  const account = await models.request.findOne({
    where: { id: accountId, organizationId, apiServiceAccount: true },
  });
  if (!account) throw new createHttpError.NotFound('could not find api account');
  return account;
};

// Every proposed grant is checked against the consenting team's ceiling at the
// point of creation as well as at request time, so an org admin cannot even
// record an intention the team has not agreed to.
const assertGrantsWithinCeilings = async (organizationId: number, grants: GrantInput[]) => {
  for (const grant of grants) {
    if (!grant.teamId) throw new createHttpError.BadRequest('organization grants must name a team');
    if (!isValidLevel(grant.level)) throw new createHttpError.BadRequest(`unknown permission level ${grant.level}`);

    const link = await getOrganizationTeamLink(organizationId, grant.teamId);
    if (!link || link.pending) {
      throw new createHttpError.BadRequest(`team #${grant.teamId} is not in this organization`);
    }

    const ceilings = await getCeilings(link.id);
    if (!isWithinCeiling({ ...grant, teamId: grant.teamId }, ceilings)) {
      throw new createHttpError.Forbidden(`team #${grant.teamId} has not consented to ${grant.level} on this scope`);
    }
  }
};

export const createOrganizationApiAccount = async (
  session: Session,
  organizationId: number,
  data: { grants?: GrantInput[] },
) => {
  await assertOrgPermission(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);

  const grants = data.grants ?? [];
  await assertGrantsWithinCeilings(organizationId, grants);

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

  await createGrants(saved.id, grants);
  await processIntegrationRequest(saved);

  orgEvent(session, organizationId, EVENTS.REQUEST_CREATE_SUCCESS, { apiAccountId: saved.id });
  return saved;
};

export const updateOrganizationApiAccountGrants = async (
  session: Session,
  organizationId: number,
  accountId: number,
  grants: GrantInput[],
) => {
  await assertOrgPermission(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
  const account = await getOrganizationApiAccount(organizationId, accountId);
  await assertGrantsWithinCeilings(organizationId, grants);

  await sequelize.transaction(async (transaction: any) => {
    await deleteGrantsForAccount(account.id, transaction);
    await createGrants(account.id, grants, transaction);
  });

  orgEvent(session, organizationId, EVENTS.ORGANIZATION_API_ACCOUNT_GRANTS_UPDATED, {
    apiAccountId: account.id,
    grantCount: grants.length,
  });

  return getGrantsForAccount(account.id);
};

export const getOrganizationApiAccountCredentials = async (
  session: Session,
  organizationId: number,
  accountId: number,
) => {
  await assertOrgPermission(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
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
  await assertOrgPermission(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
  const account = await getOrganizationApiAccount(organizationId, accountId);
  return updateClientSecret({
    serviceType: account.serviceType,
    environment: 'prod',
    realmName: 'standard',
    clientId: account.clientId,
  });
};

export const deleteOrganizationApiAccount = async (session: Session, organizationId: number, accountId: number) => {
  await assertOrgPermission(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
  const account = await getOrganizationApiAccount(organizationId, accountId);
  const isMerged = await checkIfRequestMerged(accountId);

  account.requester = getDisplayName(session);
  account.status = 'submitted';
  account.archived = true;
  account.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
  const saved = await account.save();

  if (isMerged) await processIntegrationRequest(saved);

  createEvent({
    eventCode: EVENTS.TEAM_API_ACCOUNT_DELETE_SUCCESS,
    requestId: accountId,
    organizationId,
    idirUserid: session?.idir_userid,
    idirUserDisplayName: session.user?.displayName,
  });

  return saved;
};

// An org admin needs to name a team before that team has consented to
// anything, so this deliberately searches every team rather than only the
// organization's own. Disclosure is limited to a team's id and name, and is
// gated on INVITE_TEAM. This must narrow to teams with an outstanding or
// accepted invitation if organization membership ever becomes self-serve.
export const searchTeams = async (session: Session, organizationId: number, query: string) => {
  await assertOrgPermission(session, organizationId, organizationPermissions.INVITE_TEAM);

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

// Ceilings and grants are chosen per integration, so both sides of the
// negotiation need the team's integration list. The org side is gated on
// INVITE_TEAM rather than on team membership, which no org admin has.
export const listTeamIntegrations = async (session: Session, organizationId: number, teamId: number) => {
  await assertOrgPermission(session, organizationId, organizationPermissions.INVITE_TEAM);

  return models.request.findAll({
    where: { teamId, apiServiceAccount: false, archived: false },
    attributes: ['id', 'projectName', 'clientId', 'status', 'environments', 'protocol', 'authType'],
    order: [['id', 'ASC']],
    raw: true,
  });
};

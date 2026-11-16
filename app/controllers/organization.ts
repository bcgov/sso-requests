import createHttpError from 'http-errors';
import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import { ORG_CONSENTABLE_PERMISSIONS, Permission, isSubset, isValidPermissionSet, sortPermissions } from '@sso/authz';
import { sequelize, models } from '@app/shared/sequelize/models/models';
import { Session } from '@app/shared/interfaces';
import { EMAILS } from '@app/shared/enums';
import { sendTemplate } from '@app/shared/templates';
import { getDisplayName } from '@app/utils/helpers';
import { lowcase } from '@app/helpers/string';
import { appPermissions, hasAppPermission, organizationPermissions, teamPermissions } from '@app/utils/authorize';
import {
  checkIfRequestMerged,
  assertWorkflowCompleted,
  enqueueIntegrationWorkflow,
  runIntegrationWorkflow,
} from '@app/controllers/requests';
import { audit } from '@app/queries/event';
import type { AuditAction, AuditDetails, AuditEvent } from '@sso/audit';
import { serviceAccountUsername } from '@sso/audit';
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

type OrgAction = Extract<AuditAction, `organization-${string}`>;

// A DB-only change to an organization, recorded in the transaction that makes it. Membership changes target
// the member's app user row, team links the team; everything else targets the organization.
const orgEvent = <A extends OrgAction>(
  organizationId: number,
  action: A,
  details: AuditDetails<A>,
  transaction: Transaction,
  scope: { teamId?: number; userId?: number } = {},
) =>
  audit.createEvent(
    {
      action,
      outcome: 'success',
      organizationId,
      ...(scope.teamId ? { teamId: scope.teamId } : {}),
      target: scope.userId
        ? { type: 'app-user', id: String(scope.userId) }
        : scope.teamId
        ? { type: 'team', id: String(scope.teamId) }
        : { type: 'organization', id: String(organizationId) },
      details,
    } as AuditEvent,
    transaction,
  );

const notifyOrganizationTeam = (
  organization: { id: number; name: string },
  data: {
    action: 'invited' | 'accepted' | 'declined' | 'left' | 'removed' | 'member-added' | 'member-removed';
    team?: { id: number; name: string };
    member?: { idirEmail: string; additionalEmail?: string | null };
  },
) => sendTemplate(EMAILS.ORGANIZATION_TEAM_NOTIFICATION, { organization, ...data });

const validateConsent = (permissions: unknown): Permission[] => {
  if (!isValidPermissionSet(permissions)) {
    throw new createHttpError.BadRequest(`unknown permission in ${JSON.stringify(permissions)}`);
  }
  if (!isSubset(permissions, ORG_CONSENTABLE_PERMISSIONS)) {
    // Administrative permissions resolve from an app role and reassign-team
    // stays with the team, so neither is a team's to give away.
    throw new createHttpError.BadRequest('a team cannot consent to that permission');
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

  return sequelize.transaction(async (transaction) => {
    const organization = await models.organization.create(
      { name: data.name.trim(), description: data.description?.trim() || null },
      { transaction },
    );

    const userId = session?.user?.id as number;
    if (userId) {
      await models.organizationMember.create(
        { organizationId: organization.id, userId, role: 'admin' },
        { transaction },
      );
      await orgEvent(organization.id, 'organization-member-add', { role: 'admin' }, transaction, { userId });
    }

    await orgEvent(organization.id, 'organization-create', { name: organization.name }, transaction);
    return organization;
  });
};

export const getOrganization = async (session: Session, organizationId: number) =>
  assertOrganization(session, organizationId, organizationPermissions.VIEW_ORGANIZATION);

export const updateOrganization = async (
  session: Session,
  organizationId: number,
  data: { name?: string; description?: string },
) => {
  const organization = await assertOrganization(session, organizationId, organizationPermissions.UPDATE_ORGANIZATION);
  if (data.name !== undefined && !data.name.trim()) {
    throw new createHttpError.BadRequest('organization name is required');
  }
  if (data.name !== undefined) organization.name = data.name.trim();
  if (data.description !== undefined) organization.description = data.description?.trim() || null;
  const saved = await sequelize.transaction(async (transaction) => {
    const updated = await organization.save({ transaction });
    await orgEvent(organizationId, 'organization-update', { name: updated.name }, transaction);
    return updated;
  });
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
    // Destroying the organization cascades to its members and team links, which are recorded as removals.
    const [members, links] = await Promise.all([
      models.organizationMember.findAll({ where: { organizationId }, transaction }),
      models.organizationTeam.findAll({ where: { organizationId }, transaction }),
    ]);
    await organization.destroy({ transaction });
    for (const member of members) {
      await orgEvent(organizationId, 'organization-member-remove', { reason: 'organization-deleted' }, transaction, {
        userId: member.userId,
      });
    }
    for (const link of links) {
      await orgEvent(
        organizationId,
        'organization-team-leave',
        { removedBy: 'organization', reason: 'organization-deleted' },
        transaction,
        { teamId: link.teamId },
      );
    }
    await orgEvent(organizationId, 'organization-delete', { name: organization.name }, transaction);
  });
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

  const member = await sequelize.transaction(async (transaction) => {
    const [createdMember, created] = await models.organizationMember.findOrCreate({
      where: { organizationId, userId: user.id },
      defaults: { organizationId, userId: user.id, role: data.role },
      transaction,
    });
    if (!created) throw new createHttpError.Conflict('user is already a member of this organization');
    await orgEvent(organizationId, 'organization-member-add', { role: data.role }, transaction, { userId: user.id });
    return createdMember;
  });

  const organization = await getOrganizationById(organizationId);
  if (organization) await notifyOrganizationTeam(organization, { action: 'member-added', member: user });
  return member;
};

const assertNotLastAdmin = async (organizationId: number, userId: number) => {
  const member = await models.organizationMember.findOne({ where: { organizationId, userId } });
  if (member?.role !== 'admin') return;

  const admins = await models.organizationMember.count({ where: { organizationId, role: 'admin' } });
  if (admins <= 1) {
    throw new createHttpError.Conflict('an organization must keep at least one admin; add another one first');
  }
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

  if (role !== 'admin') await assertNotLastAdmin(organizationId, userId);

  if (member.role === role) return member;

  const saved = await sequelize.transaction(async (transaction) => {
    member.role = role;
    const updated = await member.save({ transaction });
    await orgEvent(organizationId, 'organization-member-role-update', { role }, transaction, { userId });
    return updated;
  });
  return saved;
};

export const removeOrganizationMember = async (session: Session, organizationId: number, userId: number) => {
  const organization = await assertOrganization(session, organizationId, organizationPermissions.REMOVE_ORG_MEMBER);
  await assertNotLastAdmin(organizationId, userId);
  const member = await models.user.findOne({ where: { id: userId } });
  const deleted = await sequelize.transaction(async (transaction) => {
    const count = await models.organizationMember.destroy({ where: { organizationId, userId }, transaction });
    if (count) await orgEvent(organizationId, 'organization-member-remove', {}, transaction, { userId });
    return count;
  });
  if (deleted && member) await notifyOrganizationTeam(organization, { action: 'member-removed', member });
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
  const organization = await assertOrganization(session, organizationId, organizationPermissions.INVITE_TEAM);

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

  const link = await sequelize.transaction(async (transaction) => {
    let savedLink;
    if (existing) {
      existing.permissions = permissions;
      existing.invitedBy = session.user!.id;
      savedLink = await existing.save({ transaction });
    } else {
      savedLink = await models.organizationTeam.create(
        {
          organizationId,
          teamId: data.teamId,
          permissions,
          pending: true,
          invitedBy: session.user!.id,
        },
        { transaction },
      );
    }
    await orgEvent(organizationId, 'organization-team-invite', { permissions }, transaction, { teamId: data.teamId });
    return savedLink;
  });
  await notifyOrganizationTeam(organization, { team, action: 'invited' });
  return link;
};

export const removeTeamFromOrganization = async (session: Session, organizationId: number, teamId: number) => {
  const organization = await assertOrganization(session, organizationId, organizationPermissions.REMOVE_TEAM);
  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link) throw new createHttpError.NotFound('team is not linked to this organization');
  const team = await models.team.findOne({ where: { id: teamId } });
  if (!team) throw new createHttpError.NotFound('team not found');
  await sequelize.transaction(async (transaction) => {
    await link.destroy({ transaction });
    await orgEvent(organizationId, 'organization-team-leave', { removedBy: 'organization' }, transaction, { teamId });
  });
  await notifyOrganizationTeam(organization, { team, action: 'removed' });
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
  const team = await assertTeamAdmin(session, teamId);
  const organization = await getOrganizationById(organizationId);
  if (!organization) throw new createHttpError.NotFound('organization not found');

  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link?.pending) throw new createHttpError.NotFound('no pending invitation');

  if (!data.accept) {
    await sequelize.transaction(async (transaction) => {
      await link.destroy({ transaction });
      await orgEvent(organizationId, 'organization-team-decline', {}, transaction, { teamId });
    });
    await notifyOrganizationTeam(organization, { team, action: 'declined' });
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

  const saved = await sequelize.transaction(async (transaction) => {
    link.pending = false;
    const updated = await link.save({ transaction });
    await orgEvent(organizationId, 'organization-team-join', { permissions: updated.permissions }, transaction, {
      teamId,
    });
    return updated;
  });
  await notifyOrganizationTeam(organization, { team, action: 'accepted' });
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

  const saved = await sequelize.transaction(async (transaction) => {
    link.permissions = validateConsent(permissions);
    const updated = await link.save({ transaction });
    await orgEvent(organizationId, 'organization-consent-update', { permissions: updated.permissions }, transaction, {
      teamId,
    });
    return updated;
  });
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

  await sequelize.transaction(async (transaction) => {
    await replaceOverrides(link.id, await validateOverrides(teamId, overrides), transaction);
    await orgEvent(organizationId, 'organization-overrides-update', { count: overrides.length }, transaction, {
      teamId,
    });
  });
  return getOverrides(link.id);
};

export const leaveOrganization = async (session: Session, teamId: number, organizationId: number) => {
  const team = await assertTeamAdmin(session, teamId);
  const organization = await getOrganizationById(organizationId);
  if (!organization) throw new createHttpError.NotFound('organization not found');
  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link) throw new createHttpError.NotFound('team is not linked to this organization');
  await sequelize.transaction(async (transaction) => {
    await link.destroy({ transaction });
    await orgEvent(organizationId, 'organization-team-leave', { removedBy: 'team' }, transaction, { teamId });
  });
  await notifyOrganizationTeam(organization, { team, action: 'left' });
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
  await assertOrganization(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
  return models.request.findAll({
    where: { organizationId, apiServiceAccount: true, archived: false },
    attributes: API_ACCOUNT_ATTRIBUTES,
    raw: true,
  });
};

const getOrganizationApiAccount = async (organizationId: number, accountId: number) => {
  const account = await models.request.findOne({
    where: { id: accountId, organizationId, apiServiceAccount: true, archived: false },
  });
  if (!account) throw new createHttpError.NotFound('could not find api account');
  return account;
};

export const createOrganizationApiAccount = async (session: Session, organizationId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);

  // One account per organization, as for a team.
  const existing = await models.request.count({ where: { organizationId, apiServiceAccount: true, archived: false } });
  if (existing > 0) throw new createHttpError.Conflict('organization already has api account');

  const requester = getDisplayName(session);

  // The account, its workflow and the `requested` event commit together.
  const { saved, enqueued } = await sequelize.transaction(async (transaction) => {
    const account = await models.request.create(
      {
        projectName: `Service Account for organization #${organizationId}`,
        serviceType: 'gold',
        usesTeam: false,
        organizationId,
        apiServiceAccount: true,
        authType: 'service-account',
        status: 'submitted',
        requester,
        environments: ['prod'],
      },
      { transaction },
    );

    account.clientId = `service-account-org-${organizationId}-${account.id}`;
    const saved = await account.save({ transaction });
    const enqueued = await enqueueIntegrationWorkflow(saved, { awaitCompletion: true }, transaction);
    return { saved, enqueued };
  });

  // Service account creation stays synchronous: the caller reads the client credentials right after.
  assertWorkflowCompleted(await runIntegrationWorkflow(enqueued, { awaitCompletion: true }));
  return saved;
};

export const getOrganizationApiAccountCredentials = async (
  session: Session,
  organizationId: number,
  accountId: number,
) => {
  await assertOrganization(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
  const account = await getOrganizationApiAccount(organizationId, accountId);
  const credentials = await generateInstallation({
    serviceType: account.serviceType,
    environment: 'prod',
    realmName: 'standard',
    clientId: account.clientId,
    authType: account.authType,
  });
  // Strict and before returning: credentials nobody can account for are never handed out.
  await audit.createEvent({ action: 'credentials-view', outcome: 'success', ...apiAccountScope(account), details: {} });
  return credentials;
};

// An api account's secrets events: the account's own request row, its organization, and its client.
const apiAccountScope = (account: { id: number; organizationId: number; clientId: string }) => ({
  requestId: account.id,
  organizationId: account.organizationId,
  environment: 'prod' as const,
  // The account's Keycloak username, as its role assignments name it.
  target: { type: 'service-account' as const, id: serviceAccountUsername(account.clientId) },
});

export const updateOrganizationApiAccountSecret = async (
  session: Session,
  organizationId: number,
  accountId: number,
) => {
  await assertOrganization(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
  const account = await getOrganizationApiAccount(organizationId, accountId);
  return audit.runAuditedOperation({ action: 'secret-rotate', ...apiAccountScope(account), details: {} }, () =>
    updateClientSecret({
      serviceType: account.serviceType,
      environment: 'prod',
      realmName: 'standard',
      clientId: account.clientId,
    }),
  );
};

export const deleteOrganizationApiAccount = async (session: Session, organizationId: number, accountId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.MANAGE_ORG_API_ACCOUNTS);
  const account = await getOrganizationApiAccount(organizationId, accountId);
  const isMerged = await checkIfRequestMerged(accountId);

  account.requester = getDisplayName(session);
  account.status = 'submitted';
  account.archived = true;
  account.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');

  // An applied account is deleted by a workflow that removes its client; one that never reached
  // Keycloak is deleted by this change alone.
  const { saved, enqueued } = await sequelize.transaction(async (transaction) => {
    const saved = await account.save({ transaction });
    if (isMerged) {
      return { saved, enqueued: await enqueueIntegrationWorkflow(saved, { awaitCompletion: true }, transaction) };
    }
    await audit.createEvent(
      { action: 'api-account-delete', outcome: 'success', requestId: accountId, organizationId, details: {} },
      transaction,
    );
    return { saved, enqueued: undefined };
  });

  if (isMerged) assertWorkflowCompleted(await runIntegrationWorkflow(enqueued, { awaitCompletion: true }));
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

/**
 * The integrations of a team that has joined this organization — what the
 * consent actually reaches, named rather than numbered.
 *
 * Only a joined team's: an organization may look teams up to invite them
 * (searchTeams), but a team's integrations are the team's until it says
 * otherwise, and a pending invitation says nothing yet.
 */
export const listTeamIntegrations = async (session: Session, organizationId: number, teamId: number) => {
  await assertOrganization(session, organizationId, organizationPermissions.VIEW_ORGANIZATION);

  const link = await getOrganizationTeamLink(organizationId, teamId);
  if (!link || link.pending) throw new createHttpError.NotFound(`team #${teamId} is not in this organization`);

  return models.request.findAll({
    where: { teamId, apiServiceAccount: false, archived: false },
    attributes: ['id', 'projectName', 'clientId', 'status', 'environments', 'protocol', 'authType'],
    order: [['id', 'ASC']],
    raw: true,
  });
};

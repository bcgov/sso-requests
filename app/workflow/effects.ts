import { Op } from 'sequelize';
import uniq from 'lodash/uniq';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { IntegrationData } from '@app/shared/interfaces';
import { EMAILS } from '@app/shared/enums';
import { sendTemplate } from '@app/shared/templates';
import { countApplyOutcomes } from './audit';
import { getTeamById } from '@app/queries/team';
import { getRolesWithEnvironments } from '@app/queries/roles';
import {
  NewRole,
  bulkCreateRole,
  getCompositeClientRoles,
  listClientRoles,
  setCompositeClientRoles,
} from '@app/keycloak/users';
import { audit } from '@app/queries/event';
import { Environment, roleOperation } from '@sso/audit';
import { WorkflowRecord } from './types';
import {
  usesBceid,
  usesBcgovIdir,
  usesBcServicesCard,
  usesGithub,
  usesOTP,
  usesSocial,
} from '@app/helpers/integration';

/**
 * Side effects invoked by workflow steps. These live outside the controller so the workflow module graph
 * stays acyclic, and every function here is safe to call more than once for the same integration.
 */

/** Reads the authoritative row so notifications never render a stale snapshot. */
export const getFreshIntegration = (integrationId: number) =>
  models.request.findOne({ where: { id: integrationId }, raw: true });

export const updatePlannedIntegration = async (integration: IntegrationData, addingProd: boolean = false) => {
  const updatedIntegration = await getFreshIntegration(integration.id as number);

  integration = Object.assign(integration, updatedIntegration);
  if (integration.archived) return;
  // This apply's own success is already recorded, so an update is a second one.
  const isUpdate = (await countApplyOutcomes(integration.id as number, { successOnly: true })) > 1;

  if (integration.apiServiceAccount) {
    const teamIntegrations = await models.request.findAll({
      where: {
        teamId: integration.teamId,
        apiServiceAccount: false,
        archived: false,
        serviceType: 'gold',
      },
      raw: true,
      attributes: ['id', 'projectName', 'usesTeam', 'teamId', 'userId', 'devIdps', 'environments', 'authType'],
    });

    const team = await getTeamById(integration.teamId as number);
    await sendTemplate(EMAILS.CREATE_TEAM_API_ACCOUNT_APPROVED, {
      requester: integration.requester,
      team,
      integrations: teamIntegrations,
    });
  } else {
    const hasProd = integration?.environments?.includes('prod');
    const hasBceid = usesBceid(integration);
    const hasGithub = usesGithub(integration);
    const hasSocial = usesSocial(integration);
    const hasOTP = usesOTP(integration);
    const hasBcServicesCard = usesBcServicesCard(integration);
    const waitingGithubProdApproval = hasGithub && hasProd && !integration.githubApproved;
    const waitingSocialProdApproval = hasSocial && hasProd && !integration.socialApproved;
    const waitingBcServicesCardProdApproval = hasBcServicesCard && hasProd && !integration.bcServicesCardApproved;
    const waitingOTPProdApproval = hasOTP && hasProd && !integration.otpApproved;

    const approvals = {
      bceidApproved: { type: 'BCeID', environment: 'production', integration },
      devBceidApproved: { type: 'BCeID', environment: 'development', integration },
      testBceidApproved: { type: 'BCeID', environment: 'test', integration },
      githubApproved: { type: 'GitHub', environment: 'production', integration },
      bcServicesCardApproved: { type: 'BC Services Card', environment: 'production', integration },
      socialApproved: { type: 'Social', environment: 'production', integration },
      otpApproved: { type: 'One Time Passcode', environment: 'production', integration },
    };

    let approvalType;
    const isApproval = integration?.lastChanges?.some((change) => {
      // change example: {lhs: false, rhs: true, path: ['devBceidApproved']} when approving dev Bceid
      if (!change.lhs && change.rhs === true && Object.keys(approvals).includes(change.path[0])) {
        approvalType = change.path[0];
        return true;
      }
      return false;
    });

    if (isApproval && approvalType) {
      await sendTemplate(EMAILS.PROD_APPROVED, approvals[approvalType as keyof typeof approvals]);
    } else {
      const emailCode = isUpdate ? EMAILS.UPDATE_INTEGRATION_APPLIED : EMAILS.CREATE_INTEGRATION_APPLIED;
      await sendTemplate(emailCode, {
        integration,
        hasBceid,
        waitingGithubProdApproval,
        waitingBcServicesCardProdApproval,
        waitingSocialProdApproval,
        waitingOTPProdApproval,
        addingProd,
      });
    }
  }
};

/** The client roles Keycloak already held before a restore touched it: each role's composites, by environment. */
export type RolesSnapshot = Record<string, Record<string, string[]>>;

// Own keys only: role names are user-supplied, so `constructor` or `__proto__` must not match the prototype.
const has = (record: object | undefined, key: string) => !!record && Object.prototype.hasOwnProperty.call(record, key);

const roleEnvironments = (dbRoles: NewRole[], requestRoles: { environment: string }[]) =>
  uniq([...dbRoles.flatMap((role) => role.envs ?? []), ...requestRoles.map((role) => role.environment)]);

const getRestoreRoles = async (integrationId: number) => ({
  dbRoles: (await getRolesWithEnvironments(integrationId)) as NewRole[],
  requestRoles: await models.requestRole.findAll({ where: { requestId: integrationId }, raw: true }),
});

/**
 * Reads what Keycloak holds before `restoreIntegrationRoles` changes anything. The restore step stores it on
 * its first attempt, so a retry still knows which roles and composites the restore itself put there.
 */
export const snapshotIntegrationRoles = async (integrationId: number): Promise<RolesSnapshot> => {
  const integration = await getFreshIntegration(integrationId);
  if (!integration) return {};

  const { dbRoles, requestRoles } = await getRestoreRoles(integrationId);
  const snapshot: RolesSnapshot = Object.create(null);
  for (const environment of roleEnvironments(dbRoles, requestRoles)) {
    let existing: { name: string }[];
    try {
      existing = await listClientRoles(integration, { environment });
    } catch (err: any) {
      // No client in this environment: nothing exists there yet, and bulkCreateRole will report the failure.
      if (err?.status === 404) existing = [];
      else throw err;
    }
    snapshot[environment] = Object.create(null);
    for (const { name } of existing) snapshot[environment][name] = [];

    for (const role of requestRoles) {
      if (!role.composite || role.environment !== environment || !has(snapshot[environment], role.name)) continue;
      snapshot[environment][role.name] = (await getCompositeClientRoles(integration, {
        environment,
        roleName: role.name,
      })) as string[];
    }
  }
  return snapshot;
};

/**
 * Re-creates the client roles (and composite links) that existed before an integration was archived.
 * Keycloak role creation is a find-or-create, so replaying this step after a partial failure is a no-op
 * for roles that already exist.
 *
 * Each role created and each composite set changed is recorded as a child of the restore operation. What
 * changed is measured against `before`, the snapshot taken ahead of the first attempt, so a replay still
 * records what an earlier attempt changed but could not record, and skips what it already recorded.
 */
export const restoreIntegrationRoles = async (
  workflow: Pick<WorkflowRecord, 'id' | 'correlationId' | 'requestId'>,
  before: RolesSnapshot,
) => {
  const integrationId = workflow.requestId;
  const integration = await getFreshIntegration(integrationId);
  if (!integration) return;

  // The check and the insert run under a lock on the event's identity, held until the transaction ends, so an
  // attempt that timed out but kept running and its retry cannot both see no row and insert one.
  const record = async (operation: ReturnType<typeof roleOperation>) => {
    const environment = operation.environment as string;
    const roleName = operation.details.roleName;
    await sequelize.transaction(async (tx) => {
      await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
        replacements: { key: `audit-child:${workflow.correlationId}:${operation.action}:${environment}:${roleName}` },
        transaction: tx,
      });
      const existing = await models.event.count({
        where: {
          parentOperationId: workflow.correlationId,
          eventCode: operation.action,
          environment,
          targetId: roleName,
        },
        transaction: tx,
      });
      if (existing > 0) return;

      await audit.createEvent(
        { ...operation, outcome: 'success', parentOperationId: workflow.correlationId, workflowId: workflow.id },
        tx,
      );
    });
  };

  const { dbRoles, requestRoles } = await getRestoreRoles(integrationId);
  const created = await bulkCreateRole(integration, dbRoles);
  for (const { env, success, duplicate } of created) {
    // A duplicate the snapshot did not hold was created by an earlier attempt of this restore.
    for (const roleName of [...success, ...duplicate]) {
      if (has(before[env], roleName)) continue;
      await record(
        roleOperation('role-create', { requestId: integrationId, environment: env as Environment, roleName }),
      );
    }
  }

  for (const role of requestRoles) {
    if (!role.composite) continue;

    const compRoleNames: { name: string }[] = await models.requestRole.findAll({
      where: { id: { [Op.in]: role.compositeRoles }, requestId: integrationId },
      attributes: ['name'],
      raw: true,
    });

    const compositeRoleNames = compRoleNames.map((compRole: { name: string }) => compRole.name);
    await setCompositeClientRoles(integration, {
      environment: role.environment,
      roleName: role.name,
      compositeRoleNames,
    });

    const current = has(before[role.environment], role.name) ? before[role.environment][role.name] : [];
    const add = compositeRoleNames.filter((name) => !current.includes(name));
    const remove = current.filter((name) => !compositeRoleNames.includes(name));
    if (add.length + remove.length > 0) {
      await record(
        roleOperation(
          'role-composite-update',
          { requestId: integrationId, environment: role.environment as Environment, roleName: role.name },
          { add, remove },
        ),
      );
    }
  }
};

export const sendRestoreIntegrationEmail = async (integrationId: number) => {
  const integration = await getFreshIntegration(integrationId);
  if (!integration) return;
  // Team API service accounts get their own restore notification from the team controller.
  if (integration.apiServiceAccount) return;

  await sendTemplate(EMAILS.RESTORE_INTEGRATION, {
    integration,
    hasClientSecret: !integration.publicAccess || ['both', 'service-account'].includes(integration.authType),
  });
};

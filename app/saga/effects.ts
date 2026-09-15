import { Op } from 'sequelize';
import { models } from '@app/shared/sequelize/models/models';
import { IntegrationData } from '@app/shared/interfaces';
import { EMAILS, EVENTS } from '@app/shared/enums';
import { sendTemplate } from '@app/shared/templates';
import { getTeamById } from '@app/queries/team';
import { getRolesWithEnvironments } from '@app/queries/roles';
import { NewRole, bulkCreateRole, setCompositeClientRoles } from '@app/keycloak/users';
import { usesBceid, usesBcServicesCard, usesGithub, usesOTP, usesSocial } from '@app/helpers/integration';

/**
 * Side effects invoked by saga steps. These live outside the controller so the saga module graph
 * stays acyclic, and every function here is safe to call more than once for the same integration.
 */

/** Reads the authoritative row so notifications never render a stale snapshot. */
export const getFreshIntegration = async (integrationId: number) =>
  models.request.findOne({ where: { id: integrationId }, raw: true });

export const updatePlannedIntegration = async (integration: IntegrationData, addingProd: boolean = false) => {
  const updatedIntegration = await getFreshIntegration(integration.id as number);

  integration = Object.assign(integration, updatedIntegration);
  if (integration.archived) return;
  const isUpdate =
    (await models.event.count({ where: { eventCode: EVENTS.REQUEST_APPLY_SUCCESS, requestId: integration.id } })) > 1;

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

/**
 * Re-creates the client roles (and composite links) that existed before an integration was archived.
 * Keycloak role creation is a find-or-create, so replaying this step after a partial failure is a no-op
 * for roles that already exist.
 */
export const restoreIntegrationRoles = async (integrationId: number) => {
  const integration = await getFreshIntegration(integrationId);
  if (!integration) return;

  const dbRoles: NewRole[] = (await getRolesWithEnvironments(integrationId)) as NewRole[];
  await bulkCreateRole(integration, dbRoles);

  const requestRoles = await models.requestRole.findAll({ where: { requestId: integrationId }, raw: true });

  for (const role of requestRoles) {
    if (!role.composite) continue;

    const compRoleNames: { name: string }[] = await models.requestRole.findAll({
      where: { id: { [Op.in]: role.compositeRoles }, requestId: integrationId },
      attributes: ['name'],
      raw: true,
    });

    await setCompositeClientRoles(integration, {
      environment: role.environment,
      roleName: role.name,
      compositeRoleNames: compRoleNames.map((compRole: { name: string }) => compRole.name),
    });
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

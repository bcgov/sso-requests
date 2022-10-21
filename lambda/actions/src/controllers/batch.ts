import { Op } from 'sequelize';
import { models } from '@lambda-shared/sequelize/models/models';
import { sendTemplate } from '@lambda-shared/templates';
import { EVENTS, EMAILS } from '@lambda-shared/enums';
import { mergePR } from '../github';
import { usesBceid, usesGithub } from '@app/helpers/integration';
import { getTeamById } from '@lambda-app/queries/team';

const createEvent = async (data) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
};

export const handlePRstage = async (data) => {
  const { id, actionNumber, prNumber, success, changes, isEmpty, isAllowedToMerge, repoOwner, repoName } = data;
  if (isEmpty) {
    await models.request.update({ prNumber, status: 'applied', actionNumber }, { where: { id } });
  } else {
    const integration = await models.request.findOne({ where: { id } });
    if (!integration) throw Error(`integration associated with id ${id} not found`);
    if (integration.status !== 'submitted') throw Error(`integration associated with id ${id} is in an invalid stage`);

    let newStatus;
    let eventCode;
    if (!success) {
      newStatus = 'prFailed';
      eventCode = EVENTS.REQUEST_PLAN_SUCCESS;
    } else {
      if (isAllowedToMerge) {
        newStatus = 'planned';
        eventCode = EVENTS.REQUEST_PLAN_SUCCESS;
        await mergePR({ owner: repoOwner, repo: repoName, prNumber });
      } else {
        newStatus = 'pr';
        eventCode = EVENTS.REQUEST_PR_SUCCESS;
      }
    }

    integration.prNumber = prNumber;
    integration.actionNumber = actionNumber;
    integration.status = newStatus;
    await Promise.all([integration.save(), createEvent({ eventCode, requestId: id, details: { changes } })]);
  }

  return true;
};

export const getPlannedIds = async (serviceType: string) => {
  serviceType = serviceType === 'gold' ? 'gold' : 'silver';

  const integrations = await models.request.findAll({
    where: { status: { [Op.in]: ['planned', 'applyFailed'] }, serviceType },
    attributes: ['id'],
    raw: true,
  });

  return integrations.map((intg) => intg.id);
};

export const updatePlannedItems = async (data) => {
  let { ids, success } = data;
  success = String(success) === 'true';

  const newStatus = success ? 'applied' : 'applyFailed';
  const eventCode = success ? EVENTS.REQUEST_APPLY_SUCCESS : EVENTS.REQUEST_APPLY_FAILURE;
  const where = { [Op.or]: [{ id: { [Op.in]: ids } }, { status: 'applyFailed' }] };

  const integrations = await models.request.findAll({
    where,
    attributes: [
      'id',
      'realm',
      'projectName',
      'serviceType',
      'requester',
      'usesTeam',
      'teamId',
      'userId',
      'archived',
      'devIdps',
      'environments',
      'devValidRedirectUris',
      'testValidRedirectUris',
      'prodValidRedirectUris',
      'apiServiceAccount',
      'bceidApproved',
      'githubApproved',
    ],
    raw: true,
  });

  const integrationIds = integrations.map((intg) => intg.id);
  await models.request.update({ status: newStatus }, { where: { id: { [Op.in]: integrationIds } } });
  await models.event.bulkCreate(integrationIds.map((requestId) => ({ eventCode, requestId })));

  if (!success) return false;

  await Promise.all(
    integrations.map(async (integration) => {
      if (integration.archived) return;

      const isUpdate =
        (await models.event.count({ where: { eventCode: EVENTS.REQUEST_APPLY_SUCCESS, requestId: integration.id } })) >
        1;

      if (integration.apiServiceAccount) {
        const teamIntegrations = await models.request.findAll({
          where: {
            teamId: integration.teamId,
            apiServiceAccount: false,
            archived: false,
            serviceType: 'gold',
          },
          attributes: ['id', 'projectName', 'usesTeam', 'teamId', 'userId'],
        });

        const team = await getTeamById(integration.teamId);
        await sendTemplate(EMAILS.CREATE_TEAM_API_ACCOUNT_APPROVED, {
          requester: integration.requester,
          team,
          integrations: teamIntegrations,
        });
      } else {
        const hasProd = integration.environments.includes('prod');
        const hasBceid = usesBceid(integration);
        const hasGithub = usesGithub(integration);
        const waitingBceidProdApproval = hasBceid && hasProd && !integration.bceidApproved;
        const waitingGithubProdApproval = hasGithub && hasProd && !integration.githubApproved;

        const emailCode = isUpdate ? EMAILS.UPDATE_INTEGRATION_APPLIED : EMAILS.CREATE_INTEGRATION_APPLIED;
        await sendTemplate(emailCode, {
          integration,
          waitingBceidProdApproval,
          waitingGithubProdApproval,
        });
      }
    }),
  );

  return true;
};

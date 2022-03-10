import { Op } from 'sequelize';
import { models } from '@lambda-shared/sequelize/models/models';
import { sendTemplate } from '@lambda-shared/templates';
import { EVENTS, EMAILS } from '@lambda-shared/enums';
import { mergePR } from '../github';

const createEvent = async (data) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
};

export const handlePRstage = async (data) => {
  console.log(data);
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

    integration.status = newStatus;
    await Promise.all([integration.save(), createEvent({ eventCode, requestId: id, details: { changes } })]);
  }

  return true;
};

export const getPlannedIds = async () => {
  const integrations = await models.request.findAll({
    where: { status: 'planned' },
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

  const integrations = await models.request.update(
    { status: newStatus },
    { where: { [Op.or]: [{ id: { [Op.in]: ids } }, { status: 'applyFailed' }] }, returning: true, plain: true },
  );

  console.log(integrations);

  await models.event.bulkCreate(integrations.map((intg) => ({ eventCode, requestId: intg.id })));

  if (!success) return false;

  await Promise.all(
    integrations.map(async (integration) => {
      if (integration.archived) return;

      const isUpdate =
        (await models.event.count({ where: { eventCode: EVENTS.REQUEST_APPLY_SUCCESS, requestId: integration.id } })) >
        0;

      const emailCode = isUpdate ? EMAILS.UPDATE_INTEGRATION_APPROVED : EMAILS.CREATE_INTEGRATION_APPROVED;
      await sendTemplate(emailCode, { integration });
    }),
  );

  return true;
};

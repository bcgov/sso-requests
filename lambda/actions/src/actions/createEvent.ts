import { models } from '../../../shared/sequelize/models/models';
import { mergePR } from '../github';
import { sendEmail } from '../ches';

const createEvent = async (data) => {
  try {
    const result = await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
};

export default async function status(event) {
  const { body, queryStringParameters } = event;
  const {
    prNumber,
    prSuccess,
    planSuccess,
    applySuccess,
    id,
    actionNumber,
    planDetails,
    repoOwner,
    repoName,
    isAllowedToMerge,
  } = JSON.parse(body);
  const { status: githubActionsStage } = queryStringParameters || {};

  if (githubActionsStage === 'create') {
    const status = String(prSuccess) === 'true' ? 'pr' : 'prFailed';
    const eventResult = String(prSuccess) === 'true' ? 'success' : 'failure';
    await Promise.all([
      models.request.update({ prNumber, status, actionNumber }, { where: { id } }),
      createEvent({ eventCode: `request-pr-${eventResult}`, requestId: id }),
    ]);
  } else {
    // After creation, gh action only has prNumber to reference request. Using this to grab the requestId first
    const request = await models.request.findOne({ where: { prNumber } });
    if (!request) throw Error(`request associated with pr number ${prNumber} not found`);

    const { id: requestId, status: currentStatus } = request;
    const isAlreadyApplied = currentStatus === 'applied';
    if (githubActionsStage === 'plan') {
      const status = String(planSuccess) === 'true' ? 'planned' : 'planFailed';
      const eventResult = String(planSuccess) === 'true' ? 'success' : 'failure';
      await Promise.all([
        !isAlreadyApplied && models.request.update({ status }, { where: { id: requestId } }),
        createEvent({ eventCode: `request-plan-${eventResult}`, requestId, details: { planDetails } }),
      ]);
    }
    if (githubActionsStage === 'apply') {
      const status = String(applySuccess) === 'true' ? 'applied' : 'applyFailed';
      const eventResult = String(applySuccess) === 'true' ? 'success' : 'failure';
      await Promise.all([
        models.request.update({ status }, { where: { id: requestId } }),
        createEvent({ eventCode: `request-apply-${eventResult}`, requestId }),
      ]);
      const { preferredEmail } = request;
      try {
        await sendEmail({
          to: preferredEmail,
          body: '<h1>Success</h1><p>Your request was successfully submitted.</p>',
        });
      } catch (err) {
        console.error(err);
        createEvent({ eventCode: `submit-email-failed`, details: err, requestId });
      }
    }
  }

  if (isAllowedToMerge) await mergePR({ owner: repoOwner, repo: repoName, prNumber });

  return {};
}

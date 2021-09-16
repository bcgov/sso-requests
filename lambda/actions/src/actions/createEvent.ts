import { models } from '../../../shared/sequelize/models/models';
import { mergePR } from '../github';
import { sendEmail } from '../../../shared/utils/ches';
import { getEmailList } from '../../../shared/utils/helpers';
import { getEmailBody, getEmailSubject } from '../../../shared/utils/templates';
import { EVENTS } from '../../../shared/enums';

const createEvent = async (data) => {
  try {
    await models.event.create(data);
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
    const success = String(prSuccess) === 'true';
    const status = success ? 'pr' : 'prFailed';
    await Promise.all([
      models.request.update({ prNumber, status, actionNumber }, { where: { id } }),
      createEvent({ eventCode: success ? EVENTS.REQUEST_PR_SUCCESS : EVENTS.REQUEST_PR_FAILURE, requestId: id }),
    ]);
  } else {
    // After creation, gh action only has prNumber to reference request. Using this to grab the requestId first
    const request = await models.request.findOne({ where: { prNumber } });
    if (!request) throw Error(`request associated with pr number ${prNumber} not found`);

    const { id: requestId, status: currentStatus, preferredEmail } = request;
    const isAlreadyApplied = currentStatus === 'applied';
    if (githubActionsStage === 'plan') {
      const success = String(planSuccess) === 'true';
      const status = success ? 'planned' : 'planFailed';
      await Promise.all([
        !isAlreadyApplied && models.request.update({ status }, { where: { id: requestId } }),
        createEvent({
          eventCode: success ? EVENTS.REQUEST_PLAN_SUCCESS : EVENTS.REQUEST_PLAN_FAILURE,
          requestId,
          details: { planDetails },
        }),
      ]);
    }

    if (githubActionsStage === 'apply') {
      const isUpdate = !!(await models.event.findOne({
        where: { eventCode: EVENTS.REQUEST_APPLY_SUCCESS, requestId },
      }));

      const success = String(applySuccess) === 'true';
      const status = success ? 'applied' : 'applyFailed';

      await Promise.all([
        models.request.update({ status }, { where: { id: requestId } }),
        createEvent({ eventCode: success ? EVENTS.REQUEST_APPLY_SUCCESS : EVENTS.REQUEST_APPLY_FAILURE, requestId }),
      ]);

      if (success && !request.archived) {
        const emailCode = isUpdate ? 'uri-change-request-approved' : 'create-request-approved';
        const to = getEmailList(request);

        await sendEmail({
          to,
          body: getEmailBody(emailCode, {
            projectName: request.projectName,
            requestNumber: request.id,
            submittedBy: request.idirUserDisplayName,
          }),
          subject: getEmailSubject(emailCode),
          event: { emailCode, requestId },
        });
      }
    }
  }

  if (isAllowedToMerge) await mergePR({ owner: repoOwner, repo: repoName, prNumber });

  return {};
}

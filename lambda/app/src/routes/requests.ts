import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { Session, Data } from '../../../shared/interfaces';
import { kebabCase, omit } from 'lodash';
import { validateRequest } from '../utils/helpers';
import { dispatchRequestWorkflow, closeOpenPullRequests } from '../github';
import { sendEmail } from '../../../shared/utils/ches';

const NEW_REQUEST_DAY_LIMIT = 10;

const errorResponse = (err: any) => {
  console.error(err);
  return {
    statusCode: 422,
    body: JSON.stringify(err.message || err),
  };
};

const unauthorized = () => {
  return {
    statusCode: 401,
    body: JSON.stringify('unauthorized request'),
  };
};

const getEmailBody = (requestNumber: number) => `
  <h1>SSO request submitted</h1>
  <p>Your SSO request #${requestNumber} is successfully submitted. The expected processing time is 45 minutes.</p>
  <p>Once the request is approved, you will receive an email from SSO Pathfinder Team letting you know that JSON Client Installation is ready.</p>
  <p>Thanks,</p>
  <p>Pathfinder SSO Team</p>
`;

export const createRequest = async (session: Session, data: Data) => {
  const [hasFailedStatus, error] = await hasRequestWithFailedApplyStatus();
  if (error) return errorResponse(error);

  try {
    const now = new Date();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const numOfRequestsForToday = await models.request.count({
      where: {
        idirUserid: session.idir_userid,
        createdAt: {
          [Op.gt]: oneDayAgo,
          [Op.lt]: now,
        },
      },
    });

    if (numOfRequestsForToday >= NEW_REQUEST_DAY_LIMIT) {
      throw Error('reached the day limit');
    }

    const { projectName, projectLead, preferredEmail, newToSso } = data;
    const result = await models.request.create({
      idirUserid: session.idir_userid,
      projectName,
      projectLead,
      preferredEmail,
      newToSso,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ...result.dataValues, numOfRequestsForToday }),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

export const updateRequest = async (session: Session, data: Data, submit: string | undefined) => {
  const [hasFailedStatus, error] = await hasRequestWithFailedApplyStatus();
  if (error) return errorResponse(error);

  try {
    const { id, ...rest } = data;
    const original = await models.request.findOne({
      where: {
        idirUserid: session.idir_userid,
        id,
      },
    });

    if (!original) {
      return unauthorized();
    }

    if (!['draft', 'applied'].includes(original.dataValues.status)) {
      return unauthorized();
    }

    const immutableFields = ['idirUserid', 'projectLead', 'clientName', 'status'];
    const allowedRequest = omit(rest, immutableFields);
    const mergedRequest = { ...original.dataValues, ...allowedRequest };

    if (submit) {
      const isValid = validateRequest(mergedRequest);
      if (isValid !== true) return errorResponse({ ...isValid, prepared: mergedRequest });
      allowedRequest.clientName = `${kebabCase(allowedRequest.projectName)}-${id}`;
      allowedRequest.status = 'submitted';

      // trigger GitHub workflow before updating the record
      const payload = {
        requestId: mergedRequest.id,
        clientName: allowedRequest.clientName,
        realmName: mergedRequest.realm,
        validRedirectUris: {
          dev: mergedRequest.devValidRedirectUris,
          test: mergedRequest.testValidRedirectUris,
          prod: mergedRequest.prodValidRedirectUris,
        },
        environments: mergedRequest.environments,
        publicAccess: mergedRequest.publicAccess,
      };

      const ghResult = await dispatchRequestWorkflow(payload);
      console.log(JSON.stringify(ghResult));

      if (ghResult.status !== 204) {
        return errorResponse('failed to create a workflow dispatch event');
      }

      await sendEmail({
        to: allowedRequest.preferredEmail,
        body: getEmailBody(id),
        subject: 'SSO request submitted',
      });
    }

    allowedRequest.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');

    const result = await models.request.update(allowedRequest, {
      where: { id },
      returning: true,
      plain: true,
    });

    if (result.length < 2) {
      return errorResponse('update failed');
    }

    const updatedRequest = result[1].dataValues;

    return {
      statusCode: 200,
      body: JSON.stringify(updatedRequest),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

export const getRequest = async (session: Session, data: { requestId: number }) => {
  try {
    const request = await models.request.findOne({
      where: {
        idirUserid: session.idir_userid,
        id: data.requestId,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(request),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

export const getRequests = async (session: Session) => {
  try {
    const requests = await models.request.findAll({
      where: {
        idirUserid: session.idir_userid,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(requests),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

// 'draft',
// 'submitted',
// 'pr',
// 'prFailed',
// 'planned',
// 'planFailed',
// 'approved',
// 'applied',
// 'applyFailed',

const requestHasBeenMerged = async (id: number) => {
  try {
    const requests = await models.event.findAll({ where: { requestId: id } });
    console.log('request has been merged returned requsts', requests);
    if (requests.some((request) => ['request-apply-success', 'request-apply-failure'].includes(request.eventCode)))
      return [true, null];
    return [false, null];
  } catch (err) {
    return [null, err];
  }
};

export const deleteRequest = async (session: Session, data: { id: number }) => {
  const { id } = data;
  try {
    // Check if an applied/apply-failed event exists for the client
    const [isMerged, err] = await requestHasBeenMerged(id);
    if (err) throw err;
    let result;

    if (!isMerged) {
      result = await models.request.update({ archived: true }, { where: { id, idirUserid: session.idir_userid } });
      const [closed, err] = await closeOpenPullRequests(id);
      if (err) throw err;
    }
    // If not, set to archived, close any pr's that exists for it

    // If so, run request.yml with an empty environments array. Close any PR's,  Set status to archived (do from requests.yml?)

    return {
      statusCode: 200,
      body: JSON.stringify({ isMerged }),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

const hasRequestWithFailedApplyStatus = async () => {
  try {
    const applyFailedRequests = await models.request.findAll({
      where: {
        status: 'applyFailed',
      },
    });

    if (applyFailedRequests.length > 0) return [null, 'E01'];
    return [false, null];
  } catch (err) {
    return [null, err];
  }
};

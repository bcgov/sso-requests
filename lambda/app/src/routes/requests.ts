import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { Session, Data } from '../../../shared/interfaces';
import { kebabCase } from 'lodash';
import { validateRequest, processRequest, getDifferences, isAdmin, formatBody } from '../utils/helpers';
import { dispatchRequestWorkflow, closeOpenPullRequests } from '../github';
import { sendEmail } from '../../../shared/utils/ches';
import { getEmailList } from '../../../shared/utils/helpers';
import { getEmailBody, getEmailSubject } from '../../../shared/utils/templates';
import { EVENTS } from '../../../shared/enums';

const APP_ENV = process.env.APP_ENV || 'development';
const SSO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';
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

const getWhereClauseForAdmin = (session: Session, id: number) => {
  const where: any = { id };
  const userIsAdmin = isAdmin(session);
  if (!userIsAdmin) where.idirUserid = session.idir_userid;
  return where;
};

const createEvent = async (data) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
};

const bceidRealms = ['onestopauth-basic', 'onestopauth-business', 'onestopauth-both'];
const usesBceid = (realm: string | undefined) => {
  if (!realm) return false;
  return bceidRealms.includes(realm);
};

const notifyBceid = async (request: Data, idirUserDisplayName: string) => {
  const { realm, id, preferredEmail, additionalEmails } = request;
  if (!usesBceid(realm)) return;
  let cc = [preferredEmail];
  if (Array.isArray(additionalEmails)) cc = cc.concat(additionalEmails);
  const emailCode = 'bceid-request-submitted';
  const to = APP_ENV === 'production' ? ['bcgov.sso@gov.bc.ca', 'IDIM.Consulting@gov.bc.ca'] : ['bcgov.sso@gov.bc.ca'];
  return sendEmail({
    to,
    cc,
    body: formatBody(request, idirUserDisplayName),
    subject: getEmailSubject(emailCode),
    event: { emailCode, requestId: id },
  });
};

export const createRequest = async (session: Session, data: Data) => {
  const [, error] = await hasRequestWithFailedApplyStatus();
  if (error) return errorResponse(error);

  try {
    const idirUserDisplayName = session.given_name + ' ' + session.family_name;
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
      const eventData = {
        eventCode: EVENTS.REQUEST_LIMIT_REACHED,
        idirUserid: session.idir_userid,
        idirUserDisplayName,
      };
      const emailCode = 'request-limit-exceeded';
      await sendEmail({
        to: [SSO_EMAIL_ADDRESS],
        body: getEmailBody(emailCode, {
          submittedBy: idirUserDisplayName,
        }),
        subject: getEmailSubject(emailCode),
        event: { emailCode },
      });
      createEvent(eventData);
      throw Error('reached the day limit');
    }

    const { projectName, projectLead, preferredEmail, additionalEmails } = data;
    const result = await models.request.create({
      idirUserid: session.idir_userid,
      projectName,
      projectLead,
      preferredEmail,
      additionalEmails,
      idirUserDisplayName,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ...result.dataValues, numOfRequestsForToday }),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

const processEnvironments = (environments: string | string[]) => {
  if (environments === 'dev') return ['dev'];
  if (environments === 'dev, test') return ['dev', 'test'];
  if (environments === 'dev, test, prod') return ['dev', 'test', 'prod'];
  return [];
};

export const updateRequest = async (session: Session, data: Data, submit: string | undefined) => {
  const [, error] = await hasRequestWithFailedApplyStatus();
  if (error) return errorResponse(error);

  const userIsAdmin = isAdmin(session);
  const idirUserDisplayName = session.given_name + ' ' + session.family_name;
  const { id, comment, bceidEmailDetails, ...rest } = data;
  const [isUpdate] = await requestHasBeenMerged(id);

  try {
    const where = getWhereClauseForAdmin(session, id);
    const original = await models.request.findOne({ where });

    if (!original) {
      return unauthorized();
    }

    if (!['draft', 'applied'].includes(original.dataValues.status)) {
      return unauthorized();
    }

    const allowedRequest = processRequest(rest);
    const mergedRequest = { ...original.dataValues, ...allowedRequest };

    if (submit) {
      const isValid = validateRequest(mergedRequest, original.dataValues, isUpdate);
      if (isValid !== true) throw Error(JSON.stringify({ ...isValid, prepared: mergedRequest }));
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
        environments: processEnvironments(mergedRequest.environments),
        publicAccess: mergedRequest.publicAccess,
      };

      const ghResult = await dispatchRequestWorkflow(payload);
      console.log(JSON.stringify(ghResult));

      if (ghResult.status !== 204) {
        throw Error('failed to create a workflow dispatch event');
      }

      const emailCode = isUpdate ? 'uri-change-request-submitted' : 'create-request-submitted';
      const to = getEmailList(original);

      await Promise.all([
        sendEmail({
          to,
          body: getEmailBody(emailCode, {
            projectName: mergedRequest.projectName,
            requestNumber: mergedRequest.id,
            submittedBy: idirUserDisplayName,
          }),
          subject: getEmailSubject(emailCode),
          event: { emailCode, requestId: id },
        }),
        notifyBceid(mergedRequest, idirUserDisplayName),
      ]);
    }

    allowedRequest.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    allowedRequest.environments = processEnvironments(allowedRequest.environments);
    const result = await models.request.update(allowedRequest, {
      where: { id },
      returning: true,
      plain: true,
    });

    if (result.length < 2) {
      throw Error('update failed');
    }

    const updatedRequest = result[1].dataValues;

    if (submit) {
      const eventData: any = {
        eventCode: EVENTS.REQUEST_CREATE_SUCCESS,
        requestId: id,
        idirUserid: session.idir_userid,
        idirUserDisplayName,
      };

      if (isUpdate) {
        const details: any = { changes: getDifferences(mergedRequest, original.dataValues) };
        if (userIsAdmin && comment) details.comment = comment;

        eventData.eventCode = EVENTS.REQUEST_UPDATE_SUCCESS;
        eventData.details = details;
      }

      await createEvent(eventData);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(updatedRequest),
    };
  } catch (err) {
    if (submit) {
      const eventData = {
        eventCode: isUpdate ? EVENTS.REQUEST_UPDATE_FAILURE : EVENTS.REQUEST_CREATE_FAILURE,
        requestId: id,
        idirUserid: session.idir_userid,
        idirUserDisplayName,
      };

      await createEvent(eventData);
    }

    return errorResponse(err);
  }
};

export const getRequest = async (session: Session, data: { requestId: number }) => {
  try {
    const { requestId } = data;
    const where = getWhereClauseForAdmin(session, requestId);
    const request = await models.request.findOne({ where });
    return {
      statusCode: 200,
      body: JSON.stringify(request),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

// see https://sequelize.org/master/class/lib/model.js~Model.html#static-method-findAll
export const getRequestAll = async (
  session: Session,
  data: {
    searchField: string[];
    searchKey: string;
    order: any;
    limit: number;
    page: number;
    status?: string;
    archiveStatus?: string;
  },
) => {
  if (!isAdmin(session)) {
    throw Error('not allowed');
  }

  const { searchField, searchKey, order, limit, page, status = 'all', archiveStatus = 'active' } = data;

  const where: any = {};

  if (searchKey && searchField && searchField.length > 0) {
    where[Op.or] = [];
    searchField.forEach((field) => {
      if (field === 'id') {
        const id = Number(searchKey);
        if (!Number.isNaN(id)) where[Op.or].push({ id });
      } else {
        where[Op.or].push({ [field]: { [Op.iLike]: `%${searchKey}%` } });
      }
    });
  }

  if (status !== 'all') {
    where.status = status;
  }

  if (archiveStatus !== 'all') {
    where.archived = archiveStatus === 'archived';
  }

  try {
    const result: Promise<{ count: number; rows: any[] }> = await models.request.findAndCountAll({
      where,
      limit,
      offset: page > 0 ? (page - 1) * limit : 0,
      order,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

export const getRequests = async (session: Session, include: string = 'active') => {
  try {
    const where: { archived?: boolean; idirUserid: string } = { idirUserid: session.idir_userid };
    if (include === 'archived') where.archived = true;
    else if (include === 'active') where.archived = false;

    const requests = await models.request.findAll({ where });

    return {
      statusCode: 200,
      body: JSON.stringify(requests),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

const requestHasBeenMerged = async (id: number) => {
  try {
    const request = await models.event.findOne({
      where: { requestId: id, eventCode: { [Op.in]: [EVENTS.REQUEST_APPLY_SUCCESS, EVENTS.REQUEST_APPLY_FAILURE] } },
    });
    if (request) return [true, null];
    return [false, null];
  } catch (err) {
    return [null, err];
  }
};

export const deleteRequest = async (session: Session, id: number) => {
  try {
    const where = getWhereClauseForAdmin(session, id);
    const original = await models.request.findOne({ where });

    if (!original) {
      return unauthorized();
    }

    // Check if an applied/apply-failed event exists for the client
    const [isMerged, err] = await requestHasBeenMerged(id);
    if (err) throw err;

    if (isMerged) {
      const payload = {
        requestId: original.id,
        clientName: original.clientName,
        realmName: original.realm,
        validRedirectUris: {
          dev: original.devValidRedirectUris,
          test: original.testValidRedirectUris,
          prod: original.prodValidRedirectUris,
        },
        environments: [],
        publicAccess: original.publicAccess,
      };

      // Trigger workflow with empty environments to delete client
      const ghResult = await dispatchRequestWorkflow(payload);
      if (ghResult.status !== 204) {
        throw Error('failed to create a workflow dispatch event');
      }
    }

    // Close any pr's if they exist
    const [, prError] = await closeOpenPullRequests(id);
    if (prError) throw prError;

    const result = await models.request.update({ archived: true }, { where });
    const to = getEmailList(original);

    Promise.all([
      sendEmail({
        to: [SSO_EMAIL_ADDRESS],
        body: getEmailBody('request-deleted-notification-to-admin', {
          projectName: original.projectName,
          requestNumber: original.id,
          submittedBy: original.idirUserDisplayName,
        }),
        subject: getEmailSubject('request-deleted-notification-to-admin'),
        event: { emailCode: 'request-deleted-notification-to-admin', requestId: id },
      }),
      sendEmail({
        to,
        body: getEmailBody('request-deleted', {
          projectName: original.projectName,
          requestNumber: original.id,
          submittedBy: original.idirUserDisplayName,
        }),
        subject: getEmailSubject('request-deleted'),
        event: { emailCode: 'request-deleted', requestId: id },
      }),
    ]);

    createEvent({ eventCode: EVENTS.REQUEST_DELETE_SUCCESS, requestId: id, idirUserId: session.idir_userid });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    createEvent({ eventCode: EVENTS.REQUEST_DELETE_FAILURE, requestId: id, idirUserId: session.idir_userid });
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

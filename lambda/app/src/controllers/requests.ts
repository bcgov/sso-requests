import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { Session, Data, User } from '../../../shared/interfaces';
import { kebabCase } from 'lodash';
import {
  validateRequest,
  processRequest,
  getDifferences,
  isAdmin,
  usesBceid,
  notifyIdim,
  getWhereClauseForAllRequests,
  getUsersTeams,
  getWhereClauseForRequest,
  getWhereClauseForRequests,
  IDIM_EMAIL_ADDRESS,
} from '../utils/helpers';
import { dispatchRequestWorkflow, closeOpenPullRequests } from '../github';
import { sendEmail } from '../../../shared/utils/ches';
import { getEmailList } from '../../../shared/utils/helpers';
import { renderTemplate, EmailTemplate } from '../../../shared/templates';
import { EVENTS } from '../../../shared/enums';

const SSO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';
const NEW_REQUEST_DAY_LIMIT = 10;

const createEvent = async (data) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
};

export const createRequest = async (session: Session, data: Data) => {
  const [, error] = await hasRequestWithFailedApplyStatus();
  if (error) throw Error(error);

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
      ...renderTemplate(emailCode, { request: data }),
      event: { emailCode },
    });
    createEvent(eventData);
    throw Error('reached the day limit');
  }

  const { projectName, projectLead, preferredEmail, additionalEmails, usesTeam, teamId } = data;
  const result = await models.request.create({
    idirUserid: session.idir_userid,
    projectName,
    projectLead,
    preferredEmail,
    additionalEmails,
    idirUserDisplayName,
    usesTeam,
    teamId,
  });

  return { ...result.dataValues, numOfRequestsForToday };
};

export const updateRequest = async (session: Session, data: Data, user: User, submit: string | undefined) => {
  const [, error] = await hasRequestWithFailedApplyStatus();
  if (error) throw Error(error);
  const userIsAdmin = isAdmin(session);
  const idirUserDisplayName = session.given_name + ' ' + session.family_name;
  const { id, comment, bceidEmailDetails, ...rest } = data;
  const [isMerged] = await requestHasBeenMerged(id);

  try {
    const where = getWhereClauseForRequest(session, user, data.id);
    const original = await models.request.findOne({ where });
    const hasAllowedStatus = ['draft', 'applied'].includes(original.dataValues.status);

    if (!original || !hasAllowedStatus) {
      throw Error('unauthorized request');
    }

    const allowedRequest = processRequest(rest, isMerged);
    const mergedRequest = { ...original.dataValues, ...allowedRequest };

    const isApprovingBceid = !original.dataValues.bceidApproved && mergedRequest.bceidApproved;
    if (isApprovingBceid && !userIsAdmin) throw Error('unauthorized request');
    const usersTeams = await getUsersTeams(user);

    if (submit) {
      const isValid = validateRequest(mergedRequest, original.dataValues, isMerged, usersTeams);
      if (isValid !== true) throw Error(JSON.stringify({ ...isValid, prepared: mergedRequest }));
      allowedRequest.clientName = `${kebabCase(allowedRequest.projectName)}-${id}`;
      allowedRequest.status = 'submitted';
      let { environments, realm } = mergedRequest;
      const hasBceid = usesBceid(realm);
      const hasBceidProd = hasBceid && environments.includes('prod');

      if (!mergedRequest.bceidApproved && hasBceid)
        environments = environments.filter((environment) => environment !== 'prod');

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
        environments,
        publicAccess: mergedRequest.publicAccess,
        browserFlowOverride: mergedRequest.browserFlowOverride,
      };

      const ghResult = await dispatchRequestWorkflow(payload);
      console.log(JSON.stringify(ghResult));

      if (ghResult.status !== 204) {
        throw Error('failed to create a workflow dispatch event');
      }

      let emailCode: EmailTemplate;
      let cc = [];
      if (isMerged && isApprovingBceid) {
        emailCode = 'bceid-request-approved';
        cc.push(IDIM_EMAIL_ADDRESS);
      } else if (isMerged) emailCode = 'uri-change-request-submitted';
      else if (hasBceidProd) {
        emailCode = 'bceid-user-prod-submitted';
        cc.push(IDIM_EMAIL_ADDRESS);
      } else emailCode = 'create-request-submitted';

      const to = getEmailList(original);
      const event = isMerged ? 'update' : 'submission';

      await Promise.all([
        sendEmail({
          to,
          ...renderTemplate(emailCode, {
            request: mergedRequest,
            requester: isAdmin(session) ? 'SSO Admin' : mergedRequest.idirUserDisplayName,
          }),
          event: { emailCode, requestId: id },
          cc,
        }),
        notifyIdim(mergedRequest, event),
      ]);
    }

    allowedRequest.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
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

      if (isMerged) {
        const details: any = { changes: getDifferences(mergedRequest, original.dataValues) };
        if (userIsAdmin && comment) details.comment = comment;

        eventData.eventCode = EVENTS.REQUEST_UPDATE_SUCCESS;
        eventData.details = details;
      }

      await createEvent(eventData);
    }

    return updatedRequest;
  } catch (err) {
    if (submit) {
      const eventData = {
        eventCode: isMerged ? EVENTS.REQUEST_UPDATE_FAILURE : EVENTS.REQUEST_CREATE_FAILURE,
        requestId: id,
        idirUserid: session.idir_userid,
        idirUserDisplayName,
      };

      await createEvent(eventData);
    }

    throw Error(err.message || err);
  }
};

export const getRequest = async (session: Session, user: User, data: { requestId: number }) => {
  const { requestId } = data;
  const where = getWhereClauseForRequest(session, user, requestId);
  const request = await models.request.findOne({ where });
  return request;
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
    realms?: string[];
    environments?: string[];
  },
) => {
  if (!isAdmin(session)) {
    throw Error('not allowed');
  }

  const { order, limit, page, ...rest } = data;
  const where = getWhereClauseForAllRequests(rest);

  const result: Promise<{ count: number; rows: any[] }> = await models.request.findAndCountAll({
    where,
    limit,
    offset: page > 0 ? (page - 1) * limit : 0,
    order,
  });

  return result;
};

export const getRequests = async (session: Session, user: User, include: string = 'active') => {
  const where: any = getWhereClauseForRequests(user);
  if (include === 'archived') where.archived = true;
  else if (include === 'active') where.archived = false;

  const requests = await models.request.findAll({ where });

  return requests;
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

export const deleteRequest = async (session: Session, user: User, id: number) => {
  try {
    const where = getWhereClauseForRequest(session, user, id);
    const original = await models.request.findOne({ where });

    if (!original) {
      throw Error('unauthorized request');
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
        browserFlowOverride: original.browserFlowOverride,
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

    const emailCodeAdmin = 'request-deleted-notification-to-admin';
    const emailCodeUser = 'request-deleted';

    Promise.all([
      sendEmail({
        to: [SSO_EMAIL_ADDRESS],
        ...renderTemplate(emailCodeAdmin, { request: original }),
        event: { emailCode: emailCodeAdmin, requestId: id },
      }),
      sendEmail({
        to,
        ...renderTemplate(emailCodeUser, { request: original }),
        event: { emailCode: emailCodeUser, requestId: id },
      }),
      notifyIdim(original, 'deletion'),
    ]);

    createEvent({ eventCode: EVENTS.REQUEST_DELETE_SUCCESS, requestId: id, idirUserId: session.idir_userid });

    return result;
  } catch (err) {
    createEvent({ eventCode: EVENTS.REQUEST_DELETE_FAILURE, requestId: id, idirUserId: session.idir_userid });
    throw Error(err.message || err);
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

export const updateRequestMetadata = async (
  session: Session,
  user: User,
  data: { id: number; idirUserid: string; status: string },
) => {
  if (!session.client_roles?.includes('sso-admin')) {
    throw Error('not allowed');
  }

  const { id, idirUserid, status } = data;
  const result = await models.request.update(
    { idirUserid, status },
    {
      where: { id },
      returning: true,
      plain: true,
    },
  );

  if (result.length < 2) {
    throw Error('update failed');
  }

  return result[1].dataValues;
};

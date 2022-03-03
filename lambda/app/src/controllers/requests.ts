import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { Session, Data, User } from '../../../shared/interfaces';
import { kebabCase, assign, isNil } from 'lodash';
import {
  validateRequest,
  processRequest,
  getDifferences,
  isAdmin,
  getDisplayName,
  usesBceid,
  notifyIdim,
  getWhereClauseForAllRequests,
  getUsersTeams,
  IDIM_EMAIL_ADDRESS,
} from '../utils/helpers';
import { dispatchRequestWorkflow, closeOpenPullRequests } from '../github';
import { sendEmail } from '../../../shared/utils/ches';
import { getEmailList } from '../../../shared/utils/helpers';
import { renderTemplate, EmailTemplate } from '../../../shared/templates';
import { EVENTS } from '../../../shared/enums';
import { getAllowedTeams } from '@lambda-app/queries/team';
import {
  getMyOrTeamRequest,
  getAllowedRequest,
  getBaseWhereForMyOrTeamIntegrations,
} from '@lambda-app/queries/request';

const SSO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';
const NEW_REQUEST_DAY_LIMIT = 10;

const createEvent = async (data) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
};

const getRequester = async (session: Session, requestId: number) => {
  let requester = getDisplayName(session);
  const isMyOrTeamRequest = await getMyOrTeamRequest(session.user.id, requestId);
  if (!isMyOrTeamRequest && isAdmin(session)) requester = 'SSO Admin';
  return requester;
};

const checkIfHasFailedRequests = async () => {
  const numOfFailedRequests = await models.request.count({ where: { status: 'applyFailed' } });
  if (numOfFailedRequests > 0) throw Error('E01');
};

// Check if an applied/apply-failed event exists for the client
const checkIfRequestMerged = async (id: number) => {
  const request = await models.event.findOne({
    where: { requestId: id, eventCode: { [Op.in]: [EVENTS.REQUEST_APPLY_SUCCESS, EVENTS.REQUEST_APPLY_FAILURE] } },
  });

  return !!request;
};

export const createRequest = async (session: Session, data: Data) => {
  await checkIfHasFailedRequests();

  const idirUserDisplayName = session.given_name + ' ' + session.family_name;
  const now = new Date();
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const numOfRequestsForToday = await models.request.count({
    where: {
      userId: session.user.id,
      createdAt: {
        [Op.gt]: oneDayAgo,
        [Op.lt]: now,
      },
    },
  });

  if (numOfRequestsForToday >= NEW_REQUEST_DAY_LIMIT) {
    const eventData = {
      eventCode: EVENTS.REQUEST_LIMIT_REACHED,
      userId: session.user.id,
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

  const { projectName, projectLead, usesTeam, teamId } = data;
  const result = await models.request.create({
    projectName,
    projectLead,
    idirUserDisplayName,
    usesTeam,
    teamId,
    userId: session.user?.id,
  });

  return { ...result.dataValues, numOfRequestsForToday };
};

export const updateRequest = async (session: Session, data: Data, user: User, submit: string | undefined) => {
  await checkIfHasFailedRequests();

  const userIsAdmin = isAdmin(session);
  const idirUserDisplayName = getDisplayName(session);
  const { id, comment, bceidEmailDetails, ...rest } = data;
  const isMerged = await checkIfRequestMerged(id);

  try {
    const current = await getAllowedRequest(session, data.id);
    const getCurrentValue = () => current.get({ plain: true, clone: true });
    const originalData = getCurrentValue();
    const isAllowedStatus = ['draft', 'applied'].includes(current.status);

    if (!current || !isAllowedStatus) {
      throw Error('unauthorized request');
    }

    const allowedData = processRequest(rest, isMerged);
    assign(current, allowedData);
    const mergedData = getCurrentValue();

    const isApprovingBceid = !originalData.bceidApproved && current.bceidApproved;
    if (isApprovingBceid && !userIsAdmin) throw Error('unauthorized request');
    const allowedTeams = await getAllowedTeams(user, { raw: true });

    current.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    let finalData = getCurrentValue();

    if (submit) {
      const isValid = validateRequest(mergedData, originalData, isMerged, allowedTeams);
      if (isValid !== true) throw Error(JSON.stringify({ ...isValid, prepared: mergedData }));
      current.clientName = `${kebabCase(current.projectName)}-${id}`;
      current.status = 'submitted';
      let { environments, realm } = current;

      const hasBceid = usesBceid(realm);
      const hasBceidProd = hasBceid && environments.includes('prod');

      if (!current.bceidApproved && hasBceid)
        environments = environments.filter((environment) => environment !== 'prod');

      // trigger GitHub workflow before updating the record
      const payload = {
        requestId: current.id,
        clientName: current.clientName,
        realmName: current.realm,
        validRedirectUris: {
          dev: current.devValidRedirectUris,
          test: current.testValidRedirectUris,
          prod: current.prodValidRedirectUris,
        },
        environments,
        publicAccess: current.publicAccess,
        browserFlowOverride: current.browserFlowOverride,
      };

      const ghResult = await dispatchRequestWorkflow(payload);
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

      const to = await getEmailList(finalData);
      const event = isMerged ? 'update' : 'submission';

      const requester = await getRequester(session, current.id);
      allowedData.requester = requester;
      current.requester = requester;

      finalData = getCurrentValue();

      await Promise.all([
        sendEmail({
          to,
          ...renderTemplate(emailCode, {
            request: finalData,
          }),
          event: { emailCode, requestId: id },
          cc,
        }),
        notifyIdim(finalData, event, current.user.idirEmail),
      ]);
    }

    const updated = await current.save();

    if (!updated) {
      throw Error('update failed');
    }

    if (submit) {
      const eventData: any = {
        eventCode: EVENTS.REQUEST_CREATE_SUCCESS,
        requestId: id,
        userId: session.user.id,
        idirUserDisplayName,
      };

      if (isMerged) {
        const details: any = { changes: getDifferences(finalData, originalData) };
        if (userIsAdmin && comment) details.comment = comment;

        eventData.eventCode = EVENTS.REQUEST_UPDATE_SUCCESS;
        eventData.details = details;
      }

      await createEvent(eventData);
    }

    return updated.get({ plain: true });
  } catch (err) {
    console.error(err);
    if (submit) {
      const eventData = {
        eventCode: isMerged ? EVENTS.REQUEST_UPDATE_FAILURE : EVENTS.REQUEST_CREATE_FAILURE,
        requestId: id,
        userId: session.user.id,
        idirUserDisplayName,
      };

      await createEvent(eventData);
    }

    throw Error(err.message || err);
  }
};

export const getRequest = async (session: Session, user: User, data: { requestId: number }) => {
  const { requestId } = data;
  return getAllowedRequest(session, requestId);
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
    include: [
      {
        model: models.team,
        required: false,
      },
    ],
  });

  return result;
};

export const getRequests = async (session: Session, user: User, include: string = 'active') => {
  const where: any = getBaseWhereForMyOrTeamIntegrations(session.user.id);
  if (include === 'archived') where.archived = true;
  else if (include === 'active') where.archived = false;

  const requests = await models.request.findAll({
    where,
    include: [
      {
        model: models.team,
        required: false,
      },
    ],
  });

  return requests;
};

export const deleteRequest = async (session: Session, user: User, id: number) => {
  try {
    const current = await getAllowedRequest(session, id);

    if (!current) {
      throw Error('unauthorized request');
    }

    const isMerged = await checkIfRequestMerged(id);
    const requester = await getRequester(session, current.id);
    current.requester = requester;
    current.archived = true;

    if (isMerged) {
      const payload = {
        requestId: current.id,
        clientName: current.clientName,
        realmName: current.realm,
        validRedirectUris: {
          dev: current.devValidRedirectUris,
          test: current.testValidRedirectUris,
          prod: current.prodValidRedirectUris,
        },
        environments: [],
        publicAccess: current.publicAccess,
        browserFlowOverride: current.browserFlowOverride,
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

    const result = await current.save();
    const to = await getEmailList(current);

    const emailCodeAdmin = 'request-deleted-notification-to-admin';
    const emailCodeUser = 'request-deleted';

    Promise.all([
      sendEmail({
        to: [SSO_EMAIL_ADDRESS],
        ...renderTemplate(emailCodeAdmin, { request: current }),
        event: { emailCode: emailCodeAdmin, requestId: id },
      }),
      sendEmail({
        to,
        ...renderTemplate(emailCodeUser, { request: current }),
        event: { emailCode: emailCodeUser, requestId: id },
      }),
      notifyIdim(current, 'deletion', current.user.idirEmail),
    ]);

    createEvent({
      eventCode: EVENTS.REQUEST_DELETE_SUCCESS,
      requestId: id,
      userId: session.user.id,
    });

    return result.get({ plain: true });
  } catch (err) {
    createEvent({
      eventCode: EVENTS.REQUEST_DELETE_FAILURE,
      requestId: id,
      userId: session.user.id,
    });
    throw Error(err.message || err);
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

import { Op } from 'sequelize';
import kebabCase from 'lodash.kebabcase';
import assign from 'lodash.assign';
import isEmpty from 'lodash.isempty';
import isString from 'lodash.isstring';
import {
  validateRequest,
  processRequest,
  getDifferences,
  isAdmin,
  getDisplayName,
  getWhereClauseForAllRequests,
} from '../utils/helpers';
import { dispatchRequestWorkflow, closeOpenPullRequests } from '../github';
import { sequelize, models } from '@lambda-shared/sequelize/models/models';
import { Session, IntegrationData, User } from '@lambda-shared/interfaces';
import { EMAILS } from '@lambda-shared/enums';
import { sendTemplate, sendTemplates } from '@lambda-shared/templates';
import { EVENTS } from '@lambda-shared/enums';
import { getAllowedTeams } from '@lambda-app/queries/team';
import {
  getMyOrTeamRequest,
  getAllowedRequest,
  getBaseWhereForMyOrTeamIntegrations,
  getIntegrationsByTeam,
  getIntegrationsByUserTeam,
} from '@lambda-app/queries/request';
import { disableIntegration } from '@lambda-app/keycloak/client';
import { getUserTeamRole } from '@lambda-app/queries/literals';
import { canDeleteIntegration } from '@app/helpers/permissions';
import { usesBceid, usesGithub } from '@app/helpers/integration';

const ALLOW_SILVER = process.env.ALLOW_SILVER === 'true';
const ALLOW_GOLD = process.env.ALLOW_GOLD === 'true';
const APP_ENV = process.env.APP_ENV || 'development';
const NEW_REQUEST_DAY_LIMIT = APP_ENV === 'production' ? 10 : 1000;

export const createEvent = async (data) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
};

export const getRequester = async (session: Session, requestId: number) => {
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
export const checkIfRequestMerged = async (id: number) => {
  const request = await models.event.findOne({
    where: { requestId: id, eventCode: { [Op.in]: [EVENTS.REQUEST_APPLY_SUCCESS, EVENTS.REQUEST_APPLY_FAILURE] } },
  });

  return !!request;
};

export const createRequest = async (session: Session, data: IntegrationData) => {
  // let's skip this logic for now and see if we might need it back later
  // await checkIfHasFailedRequests();

  const idirUserDisplayName = session.user.displayName;
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

    createEvent(eventData);
    await sendTemplate(EMAILS.REQUEST_LIMIT_EXCEEDED, { user: session.user.displayName });
    throw Error('reached the day limit');
  }

  let { projectName, projectLead, usesTeam, teamId, serviceType } = data;
  if (!serviceType) serviceType = 'silver';
  if (!['silver', 'gold'].includes(serviceType)) throw Error('invalid service type');
  if (serviceType === 'silver' && !ALLOW_SILVER) throw Error('invalid service type');
  if (serviceType === 'gold' && !ALLOW_GOLD) throw Error('invalid service type');

  const result = await models.request.create({
    projectName,
    devLoginTitle: projectName,
    testLoginTitle: projectName,
    prodLoginTitle: projectName,
    projectLead,
    idirUserDisplayName,
    usesTeam,
    teamId,
    userId: session.user?.id,
    serviceType,
    environments: ['dev'],
  });

  return { ...result.dataValues, numOfRequestsForToday };
};

export const updateRequest = async (
  session: Session,
  data: IntegrationData,
  user: User,
  submit: string | undefined,
) => {
  // let's skip this logic for now and see if we might need it back later
  // await checkIfHasFailedRequests();

  const userIsAdmin = isAdmin(session);
  const idirUserDisplayName = getDisplayName(session);
  const { id, comment, ...rest } = data;
  const isMerged = await checkIfRequestMerged(id);

  try {
    const current = await getAllowedRequest(session, data.id);
    const getCurrentValue = () => current.get({ plain: true, clone: true });
    const originalData = getCurrentValue();
    const isAllowedStatus = ['draft', 'applied'].includes(current.status);

    if (!current || !isAllowedStatus) {
      throw Error('unauthorized request');
    }

    const allowedData = processRequest(rest, isMerged, userIsAdmin);
    assign(current, allowedData);
    const mergedData = getCurrentValue();

    const isApprovingBceid = !originalData.bceidApproved && current.bceidApproved;
    if (isApprovingBceid && !userIsAdmin) throw Error('unauthorized request');

    const isApprovingGithub = !originalData.githubApproved && current.githubApproved;
    if (isApprovingGithub && !userIsAdmin) throw Error('unauthorized request');

    const allowedTeams = await getAllowedTeams(user, { raw: true });

    current.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    let finalData = getCurrentValue();

    if (submit) {
      const validationErrors = validateRequest(mergedData, originalData, isMerged, allowedTeams);
      if (!isEmpty(validationErrors)) {
        if (isString(validationErrors)) throw Error(validationErrors);
        else throw Error(JSON.stringify({ validationError: true, errors: validationErrors, prepared: mergedData }));
      }

      // when it is submitted for the first time.
      if (!isMerged && !current.clientId) {
        current.clientId = `${kebabCase(current.projectName)}-${id}`;
      }

      current.status = 'submitted';
      let environments = current.environments.concat();

      const hadProd = originalData.environments.includes('prod');
      const hasProd = environments.includes('prod');

      const hasBceid = usesBceid(current);
      const hadBceidProd = hasBceid && hadProd;
      const hasBceidProd = hasBceid && hasProd;

      const hasGithub = usesGithub(current);
      const hadGithubProd = hasGithub && hadProd;
      const hasGithubProd = hasGithub && hasProd;

      const tfData = getCurrentValue();

      // let's use dev's idps until having a env-specific idp selections
      if (tfData.environments.includes('test')) tfData.testIdps = tfData.devIdps;
      if (tfData.environments.includes('prod')) tfData.prodIdps = tfData.devIdps;

      // prevent the TF from creating BCeID integration in prod environment if not approved
      if (!current.bceidApproved && hasBceid) {
        if (tfData.serviceType === 'gold') {
          tfData.prodIdps = tfData.prodIdps.filter((idp) => !idp.startsWith('bceid'));
        } else {
          tfData.environments = tfData.environments.filter((environment) => environment !== 'prod');
        }
      }

      // prevent the TF from creating GitHub integration in prod environment if not approved
      if (!current.githubApproved && hasGithub) {
        tfData.prodIdps = tfData.prodIdps.filter((idp) => !idp.startsWith('github'));
      }

      const ghResult = await dispatchRequestWorkflow(tfData);
      if (ghResult.status !== 204) {
        throw Error('failed to create a workflow dispatch event');
      }

      const requester = await getRequester(session, current.id);
      allowedData.requester = requester;
      current.requester = requester;

      finalData = getCurrentValue();

      const emails: { code: string; data: any }[] = [];

      // updating...
      if (isMerged) {
        if (isApprovingBceid) {
          emails.push({
            code: EMAILS.PROD_APPROVED,
            data: { integration: finalData, type: 'BCeID' },
          });
        } else if (isApprovingGithub) {
          emails.push({
            code: EMAILS.PROD_APPROVED,
            data: { integration: finalData, type: 'GitHub' },
          });
        } else {
          emails.push({
            code: EMAILS.UPDATE_INTEGRATION_SUBMITTED,
            data: {
              integration: finalData,
              bceidProdAdded: !hadBceidProd && hasBceidProd,
              githubProdAdded: !hadGithubProd && hasGithubProd,
            },
          });
        }
      } else {
        emails.push({
          code: EMAILS.CREATE_INTEGRATION_SUBMITTED,
          data: { integration: finalData, bceidProdAdded: hasBceidProd, githubProdAdded: hasGithubProd },
        });
      }

      await sendTemplates(emails);
    }

    const changes = getDifferences(finalData, originalData);
    current.lastChanges = changes;
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
        const details: any = { changes };
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
    types?: string[];
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
  // ignore api accounts
  where.apiServiceAccount = false;
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
    attributes: {
      include: [[sequelize.literal(getUserTeamRole(session.user.id)), 'userTeamRole']],
    },
  });

  return requests;
};

export const getIntegrations = async (session: Session, teamId: number, user: User, include: string = 'active') => {
  return getIntegrationsByUserTeam(user, teamId);
};

export const deleteRequest = async (session: Session, user: User, id: number) => {
  try {
    const current = await getAllowedRequest(session, id);

    if (!current) {
      throw Error('unauthorized request');
    }

    const requester = await getRequester(session, current.id);
    current.requester = requester;
    current.status = 'submitted';
    current.archived = true;

    // Trigger workflow with empty environments to delete client
    const ghResult = await dispatchRequestWorkflow(current);
    if (ghResult.status !== 204) {
      throw Error('failed to create a workflow dispatch event');
    }

    // disable the client while TF applying the changes
    await disableIntegration(current.get({ plain: true, clone: true }));

    // Close any pr's if they exist
    await closeOpenPullRequests(id);

    const result = await current.save();
    const integration = result.get({ plain: true });

    const emailCode = EMAILS.DELETE_INTEGRATION_SUBMITTED;
    const emailData = { integration };

    await sendTemplate(emailCode, emailData);

    createEvent({
      eventCode: EVENTS.REQUEST_DELETE_SUCCESS,
      requestId: id,
      userId: session.user.id,
    });

    return integration;
  } catch (err) {
    console.error(err);

    createEvent({
      eventCode: EVENTS.REQUEST_DELETE_FAILURE,
      requestId: id,
      userId: session.user.id,
    });
    throw Error(err.message || err);
  }
};

export const updateRequestMetadata = async (session: Session, user: User, data: { id: number; status: string }) => {
  if (!session.client_roles?.includes('sso-admin')) {
    throw Error('not allowed');
  }

  const { id, status } = data;
  const result = await models.request.update(
    { status },
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

export const isAllowedToDeleteIntegration = async (session: Session, integrationId: number) => {
  if (isAdmin(session)) return true;
  const integration = await getAllowedRequest(session, integrationId);
  return canDeleteIntegration(integration);
};

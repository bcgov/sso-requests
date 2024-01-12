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
import { sequelize, models } from '@lambda-shared/sequelize/models/models';
import { Session, IntegrationData, User } from '@lambda-shared/interfaces';
import { ACTION_TYPES, EMAILS, REQUEST_TYPES } from '@lambda-shared/enums';
import { sendTemplate, sendTemplates } from '@lambda-shared/templates';
import { EVENTS } from '@lambda-shared/enums';
import { getAllowedTeams, getTeamById } from '@lambda-app/queries/team';
import {
  getMyOrTeamRequest,
  getAllowedRequest,
  getBaseWhereForMyOrTeamIntegrations,
  getIntegrationsByUserTeam,
  getIntegrationByClientId,
} from '@lambda-app/queries/request';
import { disableIntegration, fetchClient } from '@lambda-app/keycloak/client';
import { getUserTeamRole } from '@lambda-app/queries/literals';
import { canDeleteIntegration } from '@app/helpers/permissions';
import {
  usesBceid,
  usesGithub,
  usesDigitalCredential,
  checkDigitalCredential,
  checkNotBceidGroup,
  checkNotGithubGroup,
} from '@app/helpers/integration';
import { NewRole, bulkCreateRole, setCompositeClientRoles } from '@lambda-app/keycloak/users';
import { getRolesWithEnvironments } from '@lambda-app/queries/roles';
import { keycloakClient } from '@lambda-app/keycloak/integration';
import { getAccountableEntity } from '@lambda-shared/templates/helpers';
import {
  oidcDurationAdditionalFields,
  samlDurationAdditionalFields,
  samlFineGrainEndpointConfig,
  samlSignedAssertions,
} from '@app/schemas';
import pick from 'lodash.pick';

const APP_ENV = process.env.APP_ENV || 'development';
const NEW_REQUEST_DAY_LIMIT = APP_ENV === 'production' ? 10 : 1000;

const envFields = [
  'DisplayHeaderTitle',
  'LoginTitle',
  'ValidRedirectUris',
  'Idps',
  ...oidcDurationAdditionalFields,
  ...samlDurationAdditionalFields,
  ...samlFineGrainEndpointConfig,
  ...samlSignedAssertions,
];

const envFieldsAll = [];
['dev', 'test', 'prod'].forEach((env) => {
  envFields.forEach((prop) => envFieldsAll.push(`${env}${prop}`));
});

const allowedFieldsForGithub = [
  'id',
  'projectName',
  'clientId',
  'clientName',
  'realm',
  'publicAccess',
  'environments',
  'bceidApproved',
  'archived',
  'browserFlowOverride',
  'serviceType',
  'authType',
  'protocol',
  'additionalRoleAttribute',
  'userId',
  'teamId',
  'apiServiceAccount',
  'requester',
  ...envFieldsAll,
];

export const createEvent = async (data) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.log(err);
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

  let {
    projectName,
    projectLead,
    usesTeam,
    teamId,
    serviceType,
    devDisplayHeaderTitle,
    testDisplayHeaderTitle,
    prodDisplayHeaderTitle,
    devSamlLogoutPostBindingUri,
    testSamlLogoutPostBindingUri,
    prodSamlLogoutPostBindingUri,
    devSamlSignAssertions,
    testSamlSignAssertions,
    prodSamlSignAssertions,
    primaryEndUsers,
    primaryEndUsersOther,
    clientId,
  } = data;
  if (!serviceType) serviceType = 'gold';

  const result = await models.request.create({
    projectName,
    devLoginTitle: projectName,
    testLoginTitle: projectName,
    prodLoginTitle: projectName,
    devSamlSignAssertions,
    testSamlSignAssertions,
    prodSamlSignAssertions,
    devDisplayHeaderTitle,
    testDisplayHeaderTitle,
    prodDisplayHeaderTitle,
    devSamlLogoutPostBindingUri,
    testSamlLogoutPostBindingUri,
    prodSamlLogoutPostBindingUri,
    projectLead,
    idirUserDisplayName,
    usesTeam,
    teamId,
    primaryEndUsers,
    primaryEndUsersOther,
    userId: session.user?.id,
    serviceType,
    environments: ['dev'],
    clientId,
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
    let existingClientId: string = '';
    const current = await getAllowedRequest(session, data.id);
    const getCurrentValue = () => current.get({ plain: true, clone: true });
    const originalData = getCurrentValue();
    const isAllowedStatus = ['draft', 'applied'].includes(current.status);

    if (current.status === 'applied' && current.clientId !== rest.clientId) existingClientId = current.clientId;

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

    const isApprovingDigitalCredential = !originalData.digitalCredentialApproved && current.digitalCredentialApproved;
    if (isApprovingDigitalCredential && !userIsAdmin) throw Error('unauthorized request');

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

      // If custom client id is provided, check if that client id is already used
      if (current.protocol === 'saml') {
        if ((current.status === 'draft' && current.clientId) || current.clientId !== originalData.clientId) {
          const existingKeycloakClient = await fetchClient({
            serviceType: 'gold',
            realmName: 'standard',
            environment: 'dev',
            clientId: current.clientId,
          });
          const existingIntegration = await getIntegrationByClientId(current.clientId);
          if (existingKeycloakClient || (existingIntegration !== null && current.id !== existingIntegration.id))
            throw Error(`${current.clientId} already exists, please choose a different client id`);
        }
      }

      current.status = 'submitted';
      let environments = current.environments.concat();

      const hasProd = environments.includes('prod');

      const hasBceid = usesBceid(current);
      const hasBceidProd = hasBceid && hasProd;

      const hasGithub = usesGithub(current);
      const hasGithubProd = hasGithub && hasProd;

      const hasDigitalCredential = usesDigitalCredential(current);
      const hasDigitalCredentialProd = hasDigitalCredential && hasProd;

      const waitingBceidProdApproval = hasBceidProd && !current.bceidApproved;
      const waitingGithubProdApproval = hasGithubProd && !current.githubApproved;
      const waitingDigitalCredentialProdApproval = hasDigitalCredentialProd && !current.digitalCredentialApproved;
      current.requester = await getRequester(session, current.id);

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
        } else if (isApprovingDigitalCredential) {
          emails.push({
            code: EMAILS.PROD_APPROVED,
            data: { integration: finalData, type: 'Digital Credential' },
          });
        } else {
          emails.push({
            code: EMAILS.UPDATE_INTEGRATION_SUBMITTED,
            data: {
              integration: finalData,
              waitingBceidProdApproval,
              waitingGithubProdApproval,
              waitingDigitalCredentialProdApproval,
            },
          });
        }
      } else {
        emails.push({
          code: EMAILS.CREATE_INTEGRATION_SUBMITTED,
          data: {
            integration: finalData,
            waitingBceidProdApproval,
            waitingGithubProdApproval,
            waitingDigitalCredentialProdApproval,
          },
        });
      }
      await sendTemplates(emails);
    }

    const changes = getDifferences(finalData, originalData);
    current.lastChanges = changes;
    let updated = await current.save();

    if (!updated) {
      throw Error('update failed');
    }

    // team id column is referencing id of teams table so it can only be set to null using `update` method
    if (updated?.usesTeam === false && updated?.teamId) {
      await models.request.update(
        { teamId: null },
        {
          where: {
            id: updated.id,
          },
          returning: true,
          omitNull: false,
        },
      );
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

      await processIntegrationRequest(updated, false, existingClientId);

      updated = await getAllowedRequest(session, data.id);
    }

    return updated.get({ plain: true });
  } catch (err) {
    console.log(err);
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

export const resubmitRequest = async (session: Session, id: number) => {
  const isMerged = await checkIfRequestMerged(id);
  if (!isMerged) return;

  try {
    const current = await getAllowedRequest(session, id);
    const getCurrentValue = () => current.get({ plain: true, clone: true });
    const isAllowedStatus = ['submitted'].includes(current.status);

    if (!current || !isAllowedStatus) {
      throw Error('unauthorized request');
    }

    current.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    current.requester = await getRequester(session, current.id);
    current.changed('updatedAt', true);

    await processIntegrationRequest(getCurrentValue());

    const updated = await current.save();
    if (!updated) {
      throw Error('update failed');
    }

    return updated.get({ plain: true });
  } catch (err) {
    console.log(err);
    throw Error(err.message || err);
  }
};

export const restoreRequest = async (session: Session, id: number) => {
  const isMerged = await checkIfRequestMerged(id);
  if (!isMerged) return;

  try {
    const current = await getAllowedRequest(session, id);
    const getCurrentValue = () => current.get({ plain: true, clone: true });
    const isAllowedStatus = ['submitted'].includes(current.status);

    if (!current || (!isAllowedStatus && !current.archived)) {
      throw Error('unauthorized request');
    }

    current.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    current.archived = false;
    current.changed('updatedAt', true);

    await processIntegrationRequest(current, true);

    const updated = await current.save();
    if (!updated) {
      throw Error('update failed');
    }

    const int = getCurrentValue();

    const dbRoles: NewRole[] = await getRolesWithEnvironments(int.id);

    await bulkCreateRole(int, dbRoles);

    const requestRoles = await models.requestRole.findAll({
      where: {
        requestId: int.id,
      },
      raw: true,
    });

    for (const role of requestRoles) {
      let compRoleNames: { name: string }[];
      if (role.composite) {
        compRoleNames = await models.requestRole.findAll({
          where: {
            id: {
              [Op.in]: role.compositeRoles,
            },
            requestId: int.id,
          },
          attributes: ['name'],
          raw: true,
        });
        await setCompositeClientRoles(int, {
          environment: role.environment,
          roleName: role.name,
          compositeRoleNames: compRoleNames.map((role: { name: string }) => role.name),
        });
      }
    }

    await sendTemplate(EMAILS.RESTORE_INTEGRATION, { integration: int });

    return updated.get({ plain: true });
  } catch (err) {
    console.log(err);
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
    devIdps: string[];
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
    current.archived = true;

    if (current.status === 'draft') {
      const result = await current.save();
      return result.get({ plain: true });
    }

    current.status = 'submitted';

    const result = await current.save();

    await processIntegrationRequest(result);

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
    console.log(err);

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

export const buildGitHubRequestData = (baseData: IntegrationData) => {
  const hasBceid = usesBceid(baseData);
  const hasGithub = usesGithub(baseData);
  const hasDigitalCredential = usesDigitalCredential(baseData);

  // let's use dev's idps until having a env-specific idp selections
  if (baseData.environments.includes('test')) baseData.testIdps = baseData.devIdps;
  if (baseData.environments.includes('prod')) baseData.prodIdps = baseData.devIdps;

  // prevent the TF from creating BCeID integration in prod environment if not approved
  if (!baseData.bceidApproved && hasBceid) {
    baseData.prodIdps = baseData.prodIdps.filter(checkNotBceidGroup);
  }

  // prevent the TF from creating VC integration in prod environment if not approved
  if (!baseData.digitalCredentialApproved && hasDigitalCredential) {
    baseData.prodIdps = baseData.prodIdps.filter((idp) => !checkDigitalCredential(idp));
  }

  // prevent the TF from creating GitHub integration in prod environment if not approved
  if (!baseData.githubApproved && hasGithub) {
    baseData.prodIdps = baseData.prodIdps.filter(checkNotGithubGroup);
  }

  return baseData;
};

export const processIntegrationRequest = async (
  integration: any,
  restore: boolean = false,
  existingClientId: string = '',
) => {
  if (integration instanceof models.request) {
    integration = integration.get({ plain: true, clone: true });
  }

  integration = buildGitHubRequestData(integration);

  const idps = integration.devIdps;

  const payload = pick(integration, allowedFieldsForGithub);
  payload.accountableEntity = (await getAccountableEntity(integration)) || '';
  payload.idpNames = idps || [];
  if (payload.serviceType === 'gold') payload.browserFlowOverride = 'idp stopper';

  if (['development', 'production'].includes(process.env.NODE_ENV)) {
    return await standardClients(payload, restore, existingClientId);
  }
};

export const standardClients = async (
  integration: IntegrationData,
  restore: boolean = false,
  existingClientId: string = '',
) => {
  // add to the queue
  const queueItem = await models.requestQueue.create({
    type: REQUEST_TYPES.INTEGRATION,
    action: integration.archived ? ACTION_TYPES.DELETE : ACTION_TYPES.UPDATE,
    requestId: integration.id,
    request: { ...integration, existingClientId },
  });
  if (!queueItem) {
    await models.request.update({ status: 'planFailed' }, { where: { id: integration?.id } });
    await createEvent({ eventCode: EVENTS.REQUEST_PLAN_FAILURE, requestId: integration.id });
    return false;
  }

  await models.request.update({ status: 'planned' }, { where: { id: integration.id } });
  await createEvent({ eventCode: EVENTS.REQUEST_PLAN_SUCCESS, requestId: integration.id });
  try {
    const responses = await Promise.all(
      integration.environments.map((env: string) => keycloakClient(env, integration, existingClientId)),
    );
    for (const res of responses) {
      if (!res) {
        throw Error('Unable to create client at keycloak');
      }
    }
  } catch (err) {
    console.error(err);
    await createEvent({ eventCode: EVENTS.REQUEST_APPLY_FAILURE, requestId: integration.id });
    await models.request.update({ status: 'applyFailed' }, { where: { id: integration?.id } });
    return false;
  }

  await createEvent({ eventCode: EVENTS.REQUEST_APPLY_SUCCESS, requestId: integration.id });
  await models.request.update({ status: 'applied' }, { where: { id: integration.id } });
  // delete from the queue
  await models.requestQueue.destroy({ where: { id: queueItem.id } });
  if (!restore) await updatePlannedIntegration(integration);
  return true;
};

export const updatePlannedIntegration = async (integration: IntegrationData) => {
  const updatedIntegration = await models.request.findOne({
    where: {
      id: integration.id,
    },
    raw: true,
  });

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
    const hasProd = integration.environments.includes('prod');
    const hasBceid = usesBceid(integration);
    const hasGithub = usesGithub(integration);
    const hasDigitalCredential = usesDigitalCredential(integration);
    const waitingBceidProdApproval = hasBceid && hasProd && !integration.bceidApproved;
    const waitingGithubProdApproval = hasGithub && hasProd && !integration.githubApproved;
    const waitingDigitalCredentialProdApproval =
      hasDigitalCredential && hasProd && !integration.digitalCredentialApproved;

    const emailCode = isUpdate ? EMAILS.UPDATE_INTEGRATION_APPLIED : EMAILS.CREATE_INTEGRATION_APPLIED;
    await sendTemplate(emailCode, {
      integration,
      waitingBceidProdApproval,
      hasBceid,
      waitingGithubProdApproval,
      waitingDigitalCredentialProdApproval,
    });
  }
};

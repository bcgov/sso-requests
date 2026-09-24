import { Op, Model } from 'sequelize';
import { camelCase, isEmpty, isString, kebabCase, upperFirst } from 'lodash';
import {
  validateRequest,
  getDifferences,
  getDisplayName,
  getBCSCEnvVars,
  getRequiredBCSCScopes,
  compareTwoArrays as compareScopes,
  getAllowedIdpsForApprover,
  normalizeRequest,
  isAdmin,
  validateIDPs,
} from '@app/utils/helpers';
import { sequelize, models } from '@app/shared/sequelize/models/models';
import { Session, IntegrationData, User } from '@app/shared/interfaces';
import { EMAILS, EVENTS } from '@app/shared/enums';
import { sendTemplate } from '@app/shared/templates';
import { getAllowedTeams, getTeamById } from '@app/queries/team';
import {
  getIntegrationsByUserTeam,
  getAnyIntegrationByClientId,
  getIntegrationById,
  getWhereClauseForAllRequests,
  getAllActiveRequests,
} from '@app/queries/request';
import { authorizeIntegration, IntegrationAccess, resolveAccessForIntegrations } from '@app/queries/integrationAccess';
import { AccessScope, accessibleIntegrationsWhere, resolveAccessScope } from '@app/queries/accessScope';
import { fetchClient } from '@app/keycloak/client';
import {
  usesBceid,
  usesGithub,
  usesDigitalCredential,
  checkNotBceidGroup,
  checkNotGithubGroup,
  usesBcServicesCard,
  checkBcServicesCard,
  usesSocial,
  checkNotSocial,
  checkNotOTP,
  usesOTP,
  usesSdxServices,
  usesBcgovIdir,
  isReservedClientId,
} from '@app/helpers/integration';
import { getAccountableEntity } from '@app/shared/templates/helpers';
import {
  oidcDurationAdditionalFields,
  samlDurationAdditionalFields,
  samlFineGrainEndpointConfig,
  samlSignedAssertions,
} from '@app/schemas';
import { pick } from 'lodash';
import {
  setupEntraIntegration,
  validateIdirEmail,
  deleteServicePrincipal,
  deleteAppRegistration,
} from '@app/utils/graph-api';
import {
  BCSCClientParameters,
  createBCSCClient,
  deleteBCSCClient,
  getBCSCClientScopeMapper,
  updateBCSCClient,
} from '@app/utils/bcsc-client';
import {
  createIdp,
  createIdpMapper,
  deleteIdp,
  getIdp,
  getIdpMappers,
  IdpMapperConfig,
  updateIdp,
} from '@app/keycloak/idp';
import {
  createClientScope,
  createClientScopeMapper,
  deleteClientScope,
  getClientScope,
  getClientScopeMapper,
  updateClientScopeMapper,
} from '@app/keycloak/clientScopes';
import {
  bcgovIdirIdpMappers,
  bcscClientScopeMappers,
  bcscIdpMappers,
  KC_ENTRA_IDP_REALM,
  KC_PS256_KEY_PROVIDER_ID,
} from '@app/utils/constants';
import createHttpError from 'http-errors';
import { approvalResetsForRemovedIdps } from '@app/helpers/permissions';
import { TRANSITIONS, deleteIntentFor } from '@app/helpers/transitions';
import { actorPayload, authorizeChanges, authorizeTransition } from '@app/utils/requestPolicy';
import axios from 'axios';
import { getKeycloakClientsByEnv } from './keycloak';
import { hasAppPermission, appPermissions, commonPermissionsForAppRoles } from '@app/utils/authorize';
import { Event } from '@app/interfaces/Event';
import { doSkipPrivacyZoneScope } from '@app/queries/custom-requests';
import { createSdxRequest } from './sdx-services';
import { getEntraClientByRequestId, saveEntraClient } from '@app/queries/entra-client';
import { createEvent } from '@app/queries/event';
import { enqueueRequestWorkflow } from '@app/workflow/request-workflow';
import { KeyCredential } from '@microsoft/microsoft-graph-types';
import { createPS256Key, getActivePS256KeyCert } from '@app/keycloak/keys';
import { getByBcgovUnitAndDivision, getDivisionById, listDivisions } from '@app/queries/division';
import { getBcgovUnitById, listBcgovUnits } from '@app/queries/bcgov-unit';
const app_env = process.env.NEXT_PUBLIC_APP_ENV || 'development';

const APP_ENV = app_env || 'development';
const NEW_REQUEST_DAY_LIMIT = APP_ENV === 'production' ? 10 : 1000;
const envFields = [
  'DisplayHeaderTitle',
  'LoginTitle',
  'ValidRedirectUris',
  'Idps',
  'OfflineAccessEnabled',
  ...oidcDurationAdditionalFields,
  ...samlDurationAdditionalFields,
  ...samlFineGrainEndpointConfig,
  ...samlSignedAssertions,
];

const envFieldsAll: any[] = [];
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
  'bcscAttributes',
  'devHomePageUri',
  'testHomePageUri',
  'prodHomePageUri',
  'bcscPrivacyZone',
  'usesTeam',
  'bcgovUnitId',
  'divisionId',
  'description',
  ...envFieldsAll,
];

// The name recorded on a change. An admin acting on an integration they
// neither own nor belong to is recorded as SSO Admin rather than by name.
export const getRequester = (session: Session, access: IntegrationAccess) => {
  const ownOrTeam = access.owner || access.userTeamRole !== null;
  return !ownOrTeam && isAdmin(session) ? 'SSO Admin' : getDisplayName(session);
};

// The client-side guards (canDeleteIntegration, canCreateOrDeleteRoles) read
// the role and the merged permissions off each row. Both come from the
// resolver rather than a SQL literal, so a list row reports the authority it
// was admitted on — including the authority an organization confers, which no
// team role describes.
const attachAccess = async (session: Session, integrations: any[], scope?: AccessScope) => {
  const access = await resolveAccessForIntegrations(session, integrations, scope);
  integrations.forEach((integration) => {
    integration.setDataValue('userTeamRole', access.get(integration.id)?.userTeamRole ?? null);
    integration.setDataValue('permissions', access.get(integration.id)?.permissions ?? []);
  });
  return integrations;
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

const authorizeClientId = (session: Session, clientId?: string | null) => {
  const proposed = clientId?.trim();
  if (!proposed) return undefined;

  if (!commonPermissionsForAppRoles(session?.client_roles).includes('integrations:write-client-id')) {
    throw new createHttpError.Forbidden('not allowed to choose a client id');
  }
  assertClientIdNotReserved(proposed);
  return proposed;
};

const assertClientIdNotReserved = (clientId: string) => {
  if (isReservedClientId(clientId)) {
    throw new createHttpError.BadRequest(`${clientId} is reserved for CSS API accounts, please choose another`);
  }
};

export const createRequest = async (session: Session, data: IntegrationData) => {
  // let's skip this logic for now and see if we might need it back later
  // await checkIfHasFailedRequests();

  const idirUserDisplayName = session?.user?.displayName;
  const now = new Date();
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const numOfRequestsForToday = await models.request.count({
    where: {
      userId: session?.user?.id as number,
      createdAt: {
        [Op.gt]: oneDayAgo,
        [Op.lt]: now,
      },
    },
  });

  if (numOfRequestsForToday >= NEW_REQUEST_DAY_LIMIT) {
    const eventData = {
      eventCode: EVENTS.REQUEST_LIMIT_REACHED,
      idirUserid: session?.idir_userid,
      idirUserDisplayName: session?.user?.displayName || '',
    };

    createEvent(eventData);
    await sendTemplate(EMAILS.REQUEST_LIMIT_EXCEEDED, { user: session?.user?.displayName || '' });
    throw new createHttpError.TooManyRequests('reached the day limit');
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
  } = data;
  if (!serviceType) serviceType = 'gold';

  const clientId = authorizeClientId(session, data.clientId);

  let result = null;

  try {
    result = await models.request.create({
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
  } catch (err) {
    throw new createHttpError.BadRequest(err as any);
  }

  return { ...result.dataValues, numOfRequestsForToday };
};

export const createBCSCIntegration = async (env: string, integration: IntegrationData, userId: number) => {
  const { bcscBaseUrl } = getBCSCEnvVars(env);

  const bcscClient = await models.bcscClient.findOne({
    where: {
      requestId: integration.id,
      environment: env,
    },
  });

  let bcscClientSecret = bcscClient?.clientSecret;
  let bcscClientId = bcscClient?.clientId;
  const bcscClientName = `${env !== 'prod' ? integration.projectName + '-' + env : integration.projectName}`;

  if (!bcscClient) {
    const clientResponse: any = await createBCSCClient(
      {
        clientName: bcscClientName,
        environment: env,
      },
      integration,
      userId,
    );
    await models.bcscClient.create({
      clientName: bcscClientName,
      requestId: integration.id,
      environment: env,
      clientSecret: clientResponse.data.client_secret,
      registrationAccessToken: clientResponse.data.registration_access_token,
      created: true,
      clientId: clientResponse.data.client_id,
    });
    bcscClientSecret = clientResponse.data.client_secret;
    bcscClientId = clientResponse.data.client_id;
  } else {
    if (bcscClient.archived) {
      bcscClient.archived = false;
    }

    bcscClient.clientName = bcscClientName;
    bcscClient.save();

    const integrationLastChanges = await getIntegrationById(integration?.id as number).then(
      (data) => data?.lastChanges,
    );

    if (
      integrationLastChanges !== null &&
      integrationLastChanges.find((change: any) =>
        [
          'projectName',
          'bcscPrivacyZone',
          'bcscAttributes',
          'devHomePageUri',
          'testHomePageUri',
          'prodHomePageUri',
        ].includes(change?.path[0]),
      )
    ) {
      await updateBCSCClient(bcscClient, integration);
    }
  }
  const requiredScopes = await getRequiredBCSCScopes(integration?.bcscAttributes as string[]);
  const idpCreated = await getIdp(env, integration?.clientId as string);
  if (!idpCreated) {
    await createIdp(
      {
        alias: integration?.clientId as string,
        displayName: `BC Services Card`,
        enabled: true,
        storeToken: true,
        providerId: 'oidc',
        realm: 'standard',
        firstBrokerLoginFlowAlias: 'first broker login',
        postBrokerLoginFlowAlias: 'idp post login',
        config: {
          clientId: bcscClientId,
          clientSecret: bcscClientSecret,
          authorizationUrl: `${bcscBaseUrl}/login/oidc/authorize`,
          tokenUrl: `${bcscBaseUrl}/oauth2/token`,
          userInfoUrl: `${bcscBaseUrl}/oauth2/userinfo`,
          jwksUrl: `${bcscBaseUrl}/oauth2/jwk`,
          syncMode: 'IMPORT',
          disableUserInfo: true,
          clientAuthMethod: 'client_secret_post',
          validateSignature: true,
          useJwksUrl: true,
          defaultScope: requiredScopes.join(' '),
        },
      },
      env,
    );
  } else if (idpCreated && !compareScopes(idpCreated?.config?.defaultScope.split(' '), requiredScopes)) {
    // if scopes don't match, update default scope
    await updateIdp({ ...idpCreated, config: { ...idpCreated.config, defaultScope: requiredScopes.join(' ') } }, env);
  }

  const idpMappers = await getIdpMappers({
    environment: env,
    idpAlias: integration?.clientId as string,
  });

  const createIdpMapperPromises = bcscIdpMappers.map((mapper) => {
    const alreadyExists = idpMappers.some((existingMapper: any) => existingMapper.name === mapper.name);
    if (!alreadyExists) {
      const payload = {
        environment: env,
        name: mapper.name,
        idpAlias: integration?.clientId as string,
        idpMapper: mapper.type,
        idpMapperConfig: {
          claim: mapper.claim ?? mapper.name,
          attribute: mapper.name,
          syncMode: 'FORCE' as 'FORCE',
          template: mapper.template,
        } as IdpMapperConfig,
      };
      if (mapper.name === 'bcsc_did') {
        payload.idpMapperConfig['user.attribute'] = mapper.name;
      }
      return createIdpMapper(payload);
    }
  });

  await Promise.all(createIdpMapperPromises);

  const clientScopeData = {
    protocol: integration?.protocol as string,
    environment: env,
    realmName: 'standard',
    scopeName: integration?.clientId as string,
  };

  let clientScope = await getClientScope(clientScopeData);
  if (!clientScope) {
    clientScope = await createClientScope(clientScopeData);
  }

  let userAttributes = (integration?.bcscAttributes as string[]).join(',');
  // When requesting any claim under the address scope, the address claim must also be included for it to be on the token.
  if (requiredScopes.includes('address') && !(integration?.bcscAttributes as string[]).includes('address')) {
    userAttributes += ',address';
  }

  // email_verified is added automatically when email attribute is requested
  if ((integration?.bcscAttributes as string[]).includes('email') && requiredScopes.includes('email')) {
    userAttributes += ',email_verified';
  }

  for (const mapper of bcscClientScopeMappers) {
    const mapperExists = await getClientScopeMapper({
      environment: env,
      scopeId: clientScope?.id as string,
      mapperName: mapper.name,
    });

    const customConfig = getBCSCClientScopeMapper(mapper.name, integration.protocol!, mapper.type, userAttributes);
    const clientScopeMapperPayload = {
      environment: env,
      realmName: 'standard',
      scopeName: clientScope?.name,
      ...customConfig,
    };

    if (!mapperExists) createClientScopeMapper({ ...clientScopeMapperPayload } as any);
    else updateClientScopeMapper({ ...clientScopeMapperPayload, id: mapperExists?.id } as any);
  }
};

export const deleteBCSCIntegration = async (request: BCSCClientParameters, keycoakClientId: string) => {
  await deleteBCSCClient({
    clientId: request?.clientId!,
    registrationToken: request.registrationAccessToken!,
    environment: request.environment!,
  });

  await models.bcscClient.update(
    {
      archived: true,
    },
    {
      where: {
        id: request.id,
      },
    },
  );
  const idpExists = await getIdp(request?.environment!, keycoakClientId);
  if (idpExists) {
    await deleteIdp({
      environment: request?.environment!,
      realmName: 'standard',
      idpAlias: keycoakClientId,
    });
  }
  const clientScope = await getClientScope({
    environment: request?.environment!,
    realmName: 'standard',
    scopeName: keycoakClientId,
  });
  if (clientScope) {
    await deleteClientScope({
      realmName: 'standard',
      environment: request?.environment!,
      scopeName: keycoakClientId,
    });
  }
};

export const usesBCSCIntegration = async (request: BCSCClientParameters, keycoakClientId: string) => {
  const idpExists = await getIdp(request?.environment!, keycoakClientId);
  const clientScope = await getClientScope({
    environment: request?.environment!,
    realmName: 'standard',
    scopeName: keycoakClientId,
  });
  if (idpExists && clientScope) {
    return true;
  }
  return false;
};

export const updateRequest = async (
  session: Session,
  data: IntegrationData,
  user: User,
  submit: string | undefined,
) => {
  // let's skip this logic for now and see if we might need it back later
  // await checkIfHasFailedRequests();
  let addingProd = false;
  const { id, comment, ...rest } = data;
  const isMerged = await checkIfRequestMerged(id!);

  try {
    let existingClientId: string = '';
    const readable = await authorizeIntegration(session, id!, 'integrations:read', { archived: false });
    if (!readable) throw new createHttpError.NotFound('Request not found');
    const { integration: current, access } = readable;
    const getCurrentValue = () => current.get({ plain: true, clone: true });
    const originalData = getCurrentValue();

    // A save is a draft's autosave; anything else is a submission
    const intent = submit ? 'submit' : 'save';
    authorizeTransition(current, intent, access);

    const submitted = normalizeRequest(rest, isMerged);
    const changed = authorizeChanges(originalData, submitted, access, { merged: isMerged });
    Object.assign(current, actorPayload(submitted));

    // A renamed client on an applied integration has its old client torn down.
    if (current.status === 'applied' && changed.includes('clientId')) existingClientId = originalData.clientId;

    const mergedData = getCurrentValue();

    Object.assign(current, approvalResetsForRemovedIdps(originalData, current));

    const validIDPSelection = validateIDPs({
      currentIdps: originalData.devIdps,
      updatedIdps: current.devIdps,
      canAddRestrictedIdps: access.permissions.includes('integrations:add-restricted-idps'),
      bceidApproved: originalData.bceidApproved,
      devBceidApproved: originalData.devBceidApproved,
      testBceidApproved: originalData.testBceidApproved,
      githubApproved: originalData.githubApproved,
      bcServicesCardApproved: originalData.bcServicesCardApproved,
      protocol: current.protocol,
    });
    if (!validIDPSelection) {
      throw new createHttpError[400]('Invalid IDP Selection');
    }

    const isBcscExcludedRequest = await doSkipPrivacyZoneScope(originalData.id);

    if (isBcscExcludedRequest && usesOTP(current)) {
      throw new createHttpError[400](
        'OTP IDP is not allowed for this integration as it is part of BCSC exclusion list',
      );
    }

    const allowedTeams = await getAllowedTeams(session, { raw: true });

    current.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    let finalData = getCurrentValue();
    let changes = null;

    if (submit) {
      const validationErrors = await validateRequest(
        mergedData,
        originalData,
        allowedTeams,
        isMerged,
        usesBcgovIdir(current) ? await listBcgovUnits() : [],
        usesBcgovIdir(current) ? await listDivisions() : [],
      );
      if (!isEmpty(validationErrors)) {
        if (isString(validationErrors)) throw new createHttpError.BadRequest(validationErrors);
        else
          throw new createHttpError.BadRequest(
            JSON.stringify({ validationError: true, errors: validationErrors, prepared: mergedData }),
          );
      }

      // Validate BC Government Unit and division selection for bcgovidir IDP
      if (usesBcgovIdir(current)) {
        const division = await getByBcgovUnitAndDivision(current.bcgovUnitId, current.divisionId);
        if (!division) {
          throw new createHttpError.BadRequest('Please select a valid division for the selected BC Gov Unit');
        }
      }

      // keycloak related operations
      // when it is submitted for the first time. A generated id ends in the
      // row's own id, so it cannot collide with another row's.
      const generatedClientId = !isMerged && !current.clientId;
      if (generatedClientId) {
        current.clientId = `${kebabCase(current.projectName)}-${id}`;
      }

      // SDX related operations
      if (process.env.NEXT_PUBLIC_INCLUDE_SDX_SERVICES === 'true' && usesSdxServices(current) && current?.sdxServices) {
        await createSdxRequest(session, current);
      }

      // Ensures requested client ID is not reserved
      if (!generatedClientId && (current.status === 'draft' || current.clientId !== originalData.clientId)) {
        assertClientIdNotReserved(current.clientId);

        const refuse = () => {
          throw new createHttpError.BadRequest(
            `${current.clientId} already exists, please choose a different client id`,
          );
        };

        const holder = await getAnyIntegrationByClientId(current.clientId);
        if (holder && holder.id !== current.id) refuse();

        for (const environment of current.environments) {
          const existingKeycloakClient = await fetchClient({
            serviceType: 'gold',
            realmName: 'standard',
            environment,
            clientId: current.clientId,
          });
          if (existingKeycloakClient) refuse();
        }
      }
      current.status = TRANSITIONS.submit.to;
      let environments = current.environments.concat();

      const hasProd = environments.includes('prod');
      addingProd = !originalData.environments.includes('prod') && hasProd;

      const removingBcscIdp =
        originalData.devIdps.includes('bcservicescard') && !current.devIdps.includes('bcservicescard');

      current.requester = getRequester(session, access);

      finalData = getCurrentValue();
      changes = getDifferences(finalData, originalData);

      if (isMerged && removingBcscIdp && hasProd) {
        await sendTemplate(EMAILS.DISABLE_BCSC_IDP, { code: EMAILS.DISABLE_BCSC_IDP, integration: finalData });
      }
    }

    current.lastChanges = changes || null;

    let updated = await current.save();

    if (!updated) {
      throw new createHttpError.UnprocessableEntity('update failed');
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
      const eventData: Event = {
        eventCode: EVENTS.REQUEST_CREATE_SUCCESS,
        requestId: id,
        idirUserid: session?.idir_userid,
        idirUserDisplayName: session?.user?.displayName || '',
      };

      if (isMerged) {
        const details: any = { changes };
        if (hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_UPDATE_REQUEST) && comment) {
          details.comment = comment;
        }

        eventData.eventCode = EVENTS.REQUEST_UPDATE_SUCCESS;
        eventData.details = details;
      }

      await createEvent(eventData);

      await processIntegrationRequest(updated, false, existingClientId, addingProd);

      const refreshed = await authorizeIntegration(session, id!, 'integrations:read');
      if (!refreshed) throw new Error('Request not found');
      updated = refreshed.integration;
    }

    return updated.get({ plain: true });
  } catch (err) {
    console.error(err);
    if (submit) {
      const eventData = {
        eventCode: isMerged ? EVENTS.REQUEST_UPDATE_FAILURE : EVENTS.REQUEST_CREATE_FAILURE,
        requestId: id,
        idirUserid: session?.idir_userid,
        idirUserDisplayName: session?.user?.displayName || '',
      };

      await createEvent(eventData);
    }

    throw new createHttpError.UnprocessableEntity((err as any).message || err);
  }
};

export const resubmitRequest = async (session: Session, id: number) => {
  const isMerged = await checkIfRequestMerged(id);
  if (!isMerged) return;

  try {
    const readable = await authorizeIntegration(session, id, 'integrations:read', { archived: false });
    if (!readable) throw new createHttpError.NotFound('Request not found');
    const { integration: current, access } = readable;
    authorizeTransition(current, 'resubmit', access);
    const getCurrentValue = () => current.get({ plain: true, clone: true });

    current.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    current.requester = getRequester(session, access);
    current.changed('updatedAt', true);

    const updated = await current.save();
    if (!updated) {
      throw new createHttpError.UnprocessableEntity('update failed');
    }

    // Enqueue is de-duplicated: if a workflow is still in flight it is simply re-driven from its last
    // completed step instead of starting a second workflow.
    await processIntegrationRequest(getCurrentValue());

    return updated.get({ plain: true });
  } catch (err) {
    console.error(err);
    throw new createHttpError.UnprocessableEntity((err as any).message || err);
  }
};

/**
 * Function to set the required properties on an integration to be owned by the supplied email IDIR address.
 * This function mutates the model.
 * @param integration The integration to update. Caution, this mutates the model.
 * @param email The email to set as the new user.
 */
const setIntegrationOwner = async (integration: Model & IntegrationData, email?: string) => {
  if (!email) throw new createHttpError.BadRequest('email is required');

  const userInfo = await validateIdirEmail(email);
  if (!userInfo) throw new createHttpError.BadRequest('invalid email address');

  let user = await models.user.findOne({
    where: {
      idirEmail: email,
    },
  });

  if (!user) {
    user = await models.user.create({
      idirEmail: email,
      displayName: getDisplayName(userInfo as Session),
    });
  }

  integration.idirUserDisplayName = getDisplayName(userInfo as Session);
  integration.usesTeam = false;
  integration.teamId = undefined;
  integration.projectLead = true;
  integration.requester = 'SSO Admin';
  integration.userId = user.id;
};

export const restoreRequest = async (session: Session, id: number, email?: string) => {
  const isMerged = await checkIfRequestMerged(id);
  if (!isMerged) return;

  try {
    const authorized = await authorizeIntegration(session, id, 'integrations:write');
    if (!authorized || (!['submitted'].includes(authorized.integration.status) && !authorized.integration.archived)) {
      throw new createHttpError.BadRequest('Request not found or in invalid state');
    }
    const { integration: current } = authorized;
    if (current.usesTeam) {
      const teamExists = await getTeamById(current.teamId);
      if (!teamExists) {
        await setIntegrationOwner(current, email);
      }
      // Always update with new email for non-team integrations
    } else {
      await setIntegrationOwner(current, email);
    }

    current.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    current.archived = false;
    current.changed('updatedAt', true);

    const updated = await current.save();
    if (!updated) {
      throw new createHttpError.UnprocessableEntity('update failed');
    }

    // Role re-creation and the restore notification are workflow steps so they only run once the
    // Keycloak clients actually exist again.
    await processIntegrationRequest(current, true);

    return updated.get({ plain: true });
  } catch (err) {
    console.error(err);
    throw new createHttpError.UnprocessableEntity((err as any).message || err);
  }
};

export const getRequest = async (session: Session, user: User, data: { requestId: number }) => {
  const authorized = await authorizeIntegration(session, data.requestId, 'integrations:read');
  return authorized?.integration ?? null;
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
  if (!hasAppPermission(session?.client_roles, appPermissions.VIEW_ADMIN_DASHBOARD)) {
    throw new createHttpError.Forbidden('not allowed');
  }

  let where = null;
  const { order, limit, page, ...rest } = data;
  const allowedIdpsForApprover = getAllowedIdpsForApprover(session);

  if (hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_VIEW_ALL_REQUESTS)) {
    where = getWhereClauseForAllRequests({
      ...rest,
    });
  } else {
    where = getWhereClauseForAllRequests({
      ...rest,
      devIdps: allowedIdpsForApprover as string[],
    });
  }

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

// The dashboard list. One scope resolves the actor's memberships; the `where`
// clause and the per-row resolve are both read off it, so the rows admitted and
// the authority attached to them cannot disagree.
export const getRequests = async (session: Session, user: User, include: string = 'active') => {
  const scope = await resolveAccessScope(session?.user?.id as number);
  const where: any = accessibleIntegrationsWhere(scope, 'integrations:read');
  if (!where) return [];

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

  return attachAccess(session, requests, scope);
};

export const getIntegrations = async (session: Session, teamId: number, user: User, include: string = 'active') => {
  const scope = await resolveAccessScope(session?.user?.id as number);
  const integrations = await getIntegrationsByUserTeam(scope, teamId);
  return attachAccess(session, integrations, scope);
};

export const deleteRequest = async (session: Session, user: User, id: number) => {
  const readable = await authorizeIntegration(session, id, 'integrations:read', { archived: false });
  if (!readable) throw new createHttpError.NotFound(`request #${id} not found`);
  const { integration: current, access } = readable;
  const transition = authorizeTransition(current, deleteIntentFor(current.status), access);

  try {
    current.requester = getRequester(session, access);
    current.archived = true;

    if (current.status === 'draft') {
      const result = await current.save();
      return result.get({ plain: true });
    }

    current.status = transition.to;

    const result = await current.save();

    await processIntegrationRequest(result);

    const integration = result.get({ plain: true });

    const emailCode = EMAILS.DELETE_INTEGRATION_SUBMITTED;
    const emailData = { integration };

    await sendTemplate(emailCode, emailData);

    createEvent({
      eventCode: EVENTS.REQUEST_DELETE_SUCCESS,
      requestId: id,
      idirUserid: session?.idir_userid,
      idirUserDisplayName: session?.user?.displayName || '',
    });

    return integration;
  } catch (err) {
    console.error(err);

    createEvent({
      eventCode: EVENTS.REQUEST_DELETE_FAILURE,
      requestId: id,
      idirUserid: session?.idir_userid,
      idirUserDisplayName: session?.user?.displayName || '',
    });
    throw new createHttpError.UnprocessableEntity((err as any).message || err);
  }
};

export const updateRequestMetadata = async (session: Session, user: User, data: { id: number; status: string }) => {
  if (!hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_UPDATE_REQUEST)) {
    throw new createHttpError.Forbidden('not allowed');
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
    throw new createHttpError.UnprocessableEntity('update failed');
  }

  return result[1].dataValues;
};

export const buildGitHubRequestData = (baseData: IntegrationData) => {
  const hasBceid = usesBceid(baseData);
  const hasGithub = usesGithub(baseData);
  const hasBCSC = usesBcServicesCard(baseData);
  const hasSocial = usesSocial(baseData);
  const hasOTP = usesOTP(baseData);

  // let's use dev's idps until having a env-specific idp selections
  if (baseData?.environments?.includes('test')) baseData.testIdps = baseData.devIdps;
  if (baseData?.environments?.includes('prod')) baseData.prodIdps = baseData.devIdps;

  // prevent creating BCeID integration in dev environment if not approved
  if (!baseData.devBceidApproved && hasBceid) {
    baseData.devIdps = baseData?.devIdps?.filter(checkNotBceidGroup);
  }

  // prevent creating BCeID integration in test environment if not approved
  if (!baseData.testBceidApproved && hasBceid) {
    baseData.testIdps = baseData?.testIdps?.filter(checkNotBceidGroup);
  }

  // prevent creating BCeID integration in prod environment if not approved
  if (!baseData.bceidApproved && hasBceid) {
    baseData.prodIdps = baseData?.prodIdps?.filter(checkNotBceidGroup);
  }

  if (!baseData.bcServicesCardApproved && hasBCSC) {
    baseData.prodIdps = baseData?.prodIdps?.filter((idp) => !checkBcServicesCard(idp));
  }

  // prevent the TF from creating GitHub integration in prod environment if not approved
  if (!baseData.githubApproved && hasGithub) {
    baseData.prodIdps = baseData?.prodIdps?.filter(checkNotGithubGroup);
  }

  if (!baseData.socialApproved && hasSocial) {
    baseData.prodIdps = baseData?.prodIdps?.filter(checkNotSocial);
  }

  if (!baseData.otpApproved && hasOTP) {
    baseData.prodIdps = baseData?.prodIdps?.filter(checkNotOTP);
  }

  return baseData;
};

/** Normalizes an integration row into the flat payload the Keycloak layer consumes. */
export const buildIntegrationPayload = async (integration: any): Promise<IntegrationData> => {
  if (integration instanceof models.request) {
    integration = integration.get({ plain: true, clone: true });
  }

  integration = buildGitHubRequestData({ ...integration });

  const idps = integration.devIdps;

  const payload = pick(integration, allowedFieldsForGithub);
  payload.accountableEntity = (await getAccountableEntity(integration)) || '';
  payload.idpNames = idps || [];

  if (payload.serviceType === 'gold') {
    const hasBcgovIdir = usesBcgovIdir(integration);
    const hasDigitalCredential = usesDigitalCredential(integration);
    const browserFlowAlias = hasDigitalCredential || hasBcgovIdir ? 'client stopper' : 'idp stopper';

    payload.browserFlowOverride = browserFlowAlias;
  }

  return payload as IntegrationData;
};

interface ProcessIntegrationOptions {
  /** Block until the workflow finishes. Only used by callers that need the Keycloak client to exist
   * before they return (team API service accounts). */
  awaitCompletion?: boolean;
}

/**
 * Hands the integration off to the workflow orchestrator and returns immediately. Callers no longer wait
 * for Keycloak; progress is tracked in `integration_workflows` and surfaced on the dashboard.
 */
export const processIntegrationRequest = async (
  integration: any,
  restore: boolean = false,
  existingClientId: string = '',
  addingProd: boolean = false,
  options: ProcessIntegrationOptions = {},
) => {
  const payload = await buildIntegrationPayload(integration);

  if (!['development', 'production'].includes(process.env.NODE_ENV)) return;

  return await enqueueRequestWorkflow(payload, {
    restore,
    existingClientId,
    addingProd,
    awaitCompletion: options.awaitCompletion,
  });
};

export const getListOfDescrepencies = async () => {
  const header = `**${
    process.env.NEXT_PUBLIC_APP_ENV === 'production' ? '' : '[SANDBOX] '
  }List of discrepancies by environment:** \n\n`;
  try {
    let data = '';
    const listOfDiscrepencies: {
      [key: string]: string[];
    } = {
      dev: [],
      test: [],
      prod: [],
    };

    for (const env of ['dev', 'test', 'prod']) {
      const cssRequests = await getAllActiveRequests(env);
      const kcClients = await getKeycloakClientsByEnv(env);

      for (const cssRqst of cssRequests) {
        const matchingKcClient = kcClients.find(
          (kcClient) => kcClient.clientId === cssRqst.clientId && kcClient.enabled,
        );
        if (!matchingKcClient) {
          listOfDiscrepencies[env].push(cssRqst.clientId);
        }
      }
    }

    if (
      listOfDiscrepencies.dev.length > 0 ||
      listOfDiscrepencies.test.length > 0 ||
      listOfDiscrepencies.prod.length > 0
    ) {
      const header = `**${
        process.env.NEXT_PUBLIC_APP_ENV === 'production' ? '' : '[SANDBOX] '
      }List of discrepancies by environment:** \n\n`;

      if (listOfDiscrepencies.dev.length > 0) data = data + `**dev:** \n${listOfDiscrepencies.dev.join(', ')}\n\n`;
      if (listOfDiscrepencies.test.length > 0) data = data + `**test:** \n${listOfDiscrepencies.test.join(', ')}\n\n`;
      if (listOfDiscrepencies.prod.length > 0) data = data + `**prod:** \n${listOfDiscrepencies.prod.join(', ')}\n\n`;
      await axios.post(
        process.env.RC_SSO_OPS_WEBHOOK || '',
        { projectName: 'css-request-monitor', message: header + data, statusCode: '' },
        { headers: { Accept: 'application/json' } },
      );
    }
    return data;
  } catch (err) {
    console.error('could not get discrepancies', err);
    await axios.post(
      process.env.RC_SSO_OPS_WEBHOOK || '',
      { projectName: 'css-request-monitor', message: '**Failed to get discrepancies**\n\n', statusCode: 'ERROR' },
      { headers: { Accept: 'application/json' } },
    );
  }
};

export const createEntraIntegration = async (environment: string, request: IntegrationData) => {
  try {
    // Resolved by priority rather than by name, because key rotation creates suffixed providers.
    let kcCert = await getActivePS256KeyCert(environment, KC_ENTRA_IDP_REALM, KC_PS256_KEY_PROVIDER_ID);

    if (!kcCert) {
      await createPS256Key(KC_PS256_KEY_PROVIDER_ID, environment, KC_ENTRA_IDP_REALM);
      kcCert = await getActivePS256KeyCert(environment, KC_ENTRA_IDP_REALM, KC_PS256_KEY_PROVIDER_ID);
      if (!kcCert) {
        throw new Error('Failed to create PS256 key and retrieve its certificate.');
      }
    }

    const getCurrentEntraClient = async () => {
      return (await getEntraClientByRequestId({ integrationId: request.id!, environment }))?.[0] || null;
    };
    const msGraphApiAuthority = `${process.env.MS_GRAPH_API_AUTHORITY}/oauth2/v2.0`;

    let entraClient = await getCurrentEntraClient();

    let application: {
      appId: string;
      secret?: KeyCredential | null;
      servicePrincipalId: string;
    } = {
      appId: '',
      servicePrincipalId: '',
      secret: undefined,
    };

    if (!request.bcgovUnitId || !request.divisionId) {
      throw new Error('BC Government Unit and division are required to create an Entra integration');
    }

    const bcgovUnit = await getBcgovUnitById(request.bcgovUnitId);
    if (!bcgovUnit) {
      throw new Error(`No BC Government Unit found for bcgovUnitId ${request.bcgovUnitId}`);
    }

    const division = await getDivisionById(request.divisionId);
    if (!division) {
      throw new Error(`No division found for divisionId ${request.divisionId}`);
    }

    const appName = `${bcgovUnit.code.toUpperCase()}-${division.code.toUpperCase()}-${upperFirst(
      camelCase(request.projectName),
    )}-${request.id}-${upperFirst(environment)}`;
    if (!entraClient) {
      application = await setupEntraIntegration(appName, environment, request, kcCert, bcgovUnit.name, division.name);
      if (application) {
        entraClient = await saveEntraClient({
          appName,
          appId: application.appId,
          keyThumbprint: application?.secret?.customKeyIdentifier || null,
          servicePrincipalId: application.servicePrincipalId,
          environment,
          requestId: request.id!,
        });
      }
    }

    const idpCreated = await getIdp(environment, request.clientId!, KC_ENTRA_IDP_REALM);

    if (!idpCreated) {
      entraClient = await getCurrentEntraClient();

      await createIdp(
        {
          alias: request.clientId as string,
          displayName: request.projectName as string,
          enabled: true,
          storeToken: false,
          providerId: 'oidc',
          realm: KC_ENTRA_IDP_REALM,
          firstBrokerLoginFlowAlias: 'first broker login - auto link existing user',
          postBrokerLoginFlowAlias: '',
          config: {
            clientId: entraClient.appId,
            authorizationUrl: `${msGraphApiAuthority}/authorize`,
            tokenUrl: `${msGraphApiAuthority}/token`,
            logoutUrl: `${msGraphApiAuthority}/logout`,
            userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
            jwksUrl: `${process.env.MS_GRAPH_API_AUTHORITY}/discovery/v2.0/keys`,
            syncMode: 'IMPORT',
            disableUserInfo: true,
            validateSignature: true,
            useJwksUrl: true,
            defaultScope: 'openid profile email',
            clientAuthMethod: 'private_key_jwt',
            jwtX509HeadersEnabled: true,
            clientAssertionSigningAlg: 'PS256',
            clientAssertionAudience: `${msGraphApiAuthority}/token`,
          },
        },
        environment,
      );
    }

    const idpMappers = await getIdpMappers({
      environment,
      idpAlias: request?.clientId as string,
      realmName: KC_ENTRA_IDP_REALM,
    });

    const createIdpMapperPromises = bcgovIdirIdpMappers.map(async (mapper) => {
      const alreadyExists = idpMappers.some((existingMapper: any) => existingMapper.name === mapper.name);
      if (!alreadyExists) {
        const payload = {
          environment: environment,
          name: mapper.name,
          idpAlias: request?.clientId as string,
          idpMapper: mapper.type,
          realmName: KC_ENTRA_IDP_REALM,
          idpMapperConfig: {
            claim: mapper.claim ?? mapper.name,
            'user.attribute': mapper.name,
            syncMode: 'FORCE',
            template: mapper.template,
          } as IdpMapperConfig,
        };
        return await createIdpMapper(payload);
      }
    });
    await Promise.all(createIdpMapperPromises);
  } catch (err) {
    console.error('could not create Entra integration', err);
    throw err;
  }
};

export const deleteEntraIntegration = async (environment: string, request: IntegrationData) => {
  try {
    const entraClient = (await getEntraClientByRequestId({ integrationId: request?.id!, environment }))?.[0] || null;
    if (!entraClient) return;
    await deleteServicePrincipal(entraClient?.servicePrincipalId);
    await deleteAppRegistration(entraClient?.appId);
    const idp = await getIdp(environment, request.clientId!, KC_ENTRA_IDP_REALM);
    if (idp) {
      await deleteIdp({ environment, idpAlias: request.clientId!, realmName: KC_ENTRA_IDP_REALM });
    }
    await entraClient.destroy();
  } catch (err) {
    console.error('could not delete Entra integration', err);
    throw err;
  }
};

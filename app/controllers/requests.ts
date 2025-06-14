import { Op, Model } from 'sequelize';
import kebabCase from 'lodash.kebabcase';
import assign from 'lodash.assign';
import isEmpty from 'lodash.isempty';
import isString from 'lodash.isstring';
import {
  validateRequest,
  getDifferences,
  isAdmin,
  getDisplayName,
  getBCSCEnvVars,
  getRequiredBCSCScopes,
  compareTwoArrays as compareScopes,
  getAllowedIdpsForApprover,
  isBceidApprover,
  isGithubApprover,
  isBCServicesCardApprover,
  sanitizeRequest,
} from '@app/utils/helpers';
import { sequelize, models } from '@app/shared/sequelize/models/models';
import { Session, IntegrationData, User } from '@app/shared/interfaces';
import { ACTION_TYPES, EMAILS, REQUEST_TYPES } from '@app/shared/enums';
import { sendTemplate, sendTemplates } from '@app/shared/templates';
import { EVENTS } from '@app/shared/enums';
import { getAllowedTeams, getTeamById } from '@app/queries/team';
import {
  getMyOrTeamRequest,
  getAllowedRequest,
  getBaseWhereForMyOrTeamIntegrations,
  getIntegrationsByUserTeam,
  getIntegrationByClientId,
  canUpdateRequestByUserId,
  getIntegrationById,
  getWhereClauseForAllRequests,
  getAllActiveRequests,
} from '@app/queries/request';
import { fetchClient } from '@app/keycloak/client';
import { getUserTeamRole } from '@app/queries/literals';
import { canDeleteIntegration } from '@app/helpers/permissions';
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
} from '@app/helpers/integration';
import { NewRole, bulkCreateRole, setCompositeClientRoles } from '@app/keycloak/users';
import { getRolesWithEnvironments } from '@app/queries/roles';
import { keycloakClient } from '@app/keycloak/integration';
import { getAccountableEntity } from '@app/shared/templates/helpers';
import {
  oidcDurationAdditionalFields,
  samlDurationAdditionalFields,
  samlFineGrainEndpointConfig,
  samlSignedAssertions,
  test,
} from '@app/schemas';
import pick from 'lodash.pick';
import { validateIdirEmail } from '@app/utils/ms-graph-idir';
import { BCSCClientParameters, createBCSCClient, deleteBCSCClient, updateBCSCClient } from '@app/utils/bcsc-client';
import { createIdp, createIdpMapper, deleteIdp, getIdp, getIdpMappers, updateIdp } from '@app/keycloak/idp';
import {
  createClientScope,
  createClientScopeMapper,
  deleteClientScope,
  getClientScope,
  getClientScopeMapper,
  updateClientScopeMapper,
} from '@app/keycloak/clientScopes';
import { bcscIdpMappers } from '@app/utils/constants';
import createHttpError from 'http-errors';
import { isSocialApprover, validateIDPs } from '@app/utils/helpers';
import { getIdpApprovalStatus } from '@app/helpers/permissions';
import getConfig from 'next/config';
import { Integration } from '@app/interfaces/Request';
import axios from 'axios';
import { getKeycloakClientsByEnv } from './keycloak';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { app_env } = publicRuntimeConfig;

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
  ...envFieldsAll,
];

export const createEvent = async (data: any) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.log(err);
  }
};

export const getRequester = async (session: Session, requestId: number) => {
  let requester = getDisplayName(session);
  const isMyOrTeamRequest = await getMyOrTeamRequest(session?.user?.id as number, requestId);
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
      userId: session?.user?.id as number,
      idirUserDisplayName,
    };

    createEvent(eventData);
    await sendTemplate(EMAILS.REQUEST_LIMIT_EXCEEDED, { user: session?.user?.displayName });
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
    clientId,
  } = data;
  if (!serviceType) serviceType = 'gold';

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
      return createIdpMapper({
        environment: env,
        name: mapper.name,
        idpAlias: integration?.clientId as string,
        idpMapper: mapper.type,
        idpMapperConfig: {
          claim: mapper.name,
          attribute: mapper.name,
          syncMode: 'FORCE',
          template: mapper.template,
        },
      });
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

  const mapperExists = await getClientScopeMapper({
    environment: env,
    scopeId: clientScope?.id as string,
    mapperName: 'attributes',
  });

  const clientScopeMapperPayload = {
    environment: env,
    realmName: 'standard',
    scopeName: clientScope?.name,
    protocol: integration.protocol === 'oidc' ? 'openid-connect' : 'saml',
    protocolMapper: integration.protocol === 'oidc' ? 'oidc-idp-userinfo-mapper' : 'saml-idp-userinfo-mapper',
    protocolMapperName: 'attributes',
    protocolMapperConfig: {
      signatureExpected: true,
      userAttributes,
      'claim.name': 'attributes',
    },
  };

  if (integration.protocol === 'oidc') {
    Object.assign(clientScopeMapperPayload['protocolMapperConfig'], {
      'jsonType.label': 'String' as const,
      'id.token.claim': true,
      'access.token.claim': true,
      'userinfo.token.claim': true,
    });
  }

  if (!mapperExists) createClientScopeMapper({ ...clientScopeMapperPayload } as any);
  else updateClientScopeMapper({ ...clientScopeMapperPayload, id: mapperExists?.id } as any);
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
  const userIsAdmin = isAdmin(session);
  const bceidApprover = isBceidApprover(session);
  const githubApprover = isGithubApprover(session);
  const bcscApprover = isBCServicesCardApprover(session);
  const socialApprover = isSocialApprover(session);
  const allowedToUpdate = canUpdateRequestByUserId(session?.user?.id as number, data?.id!);
  const idirUserDisplayName = getDisplayName(session);
  const { id, comment, ...rest } = data;
  const isMerged = await checkIfRequestMerged(id!);

  try {
    let existingClientId: string = '';
    const current = await getAllowedRequest(session, data?.id!);
    if (!current) throw new Error('Request not found');
    const getCurrentValue = () => current.get({ plain: true, clone: true });

    if (current.status === 'applied' && !submit) {
      throw Error('Temporary updates not allowed for applied requests.');
    }

    const originalData = getCurrentValue();
    const isAllowedStatus = ['draft', 'applied'].includes(current.status);

    if (current.status === 'applied' && current.clientId !== rest.clientId) existingClientId = current.clientId;

    if (!current || !isAllowedStatus) {
      throw new createHttpError.BadRequest('Request not found or not in draft or applied status');
    }

    if (originalData.status === 'applied') {
      // Once an integration has been created for a team, cannot revert to single person ownership.
      if (originalData.usesTeam && !rest.usesTeam) rest.usesTeam = originalData.usesTeam;
      if (!originalData.projectLead && rest.projectLead) rest.projectLead = originalData.projectLead;

      // preserve environments if already applied
      rest.environments = originalData.environments.concat(
        rest?.environments?.filter((env) => {
          if (!originalData.environments.includes(env) && ['dev', 'test', 'prod'].includes(env)) return env;
        }),
      );
    }

    const allowedData = sanitizeRequest(session, rest, isMerged);
    assign(current, allowedData);

    const mergedData = getCurrentValue();

    const isApprovingBceid = !originalData.bceidApproved && current.bceidApproved;
    const isApprovingGithub = !originalData.githubApproved && current.githubApproved;
    const isApprovingBCSC = !originalData.bcServicesCardApproved && current.bcServicesCardApproved;
    const isApprovingSocial = !originalData.socialApproved && current.socialApproved;

    const updatedAttributes = getIdpApprovalStatus({
      isAdmin: userIsAdmin,
      originalData,
      updatedData: current,
      bceidApprover,
      githubApprover,
      bcscApprover,
      socialApprover,
    });
    assign(current, updatedAttributes);

    const validIDPSelection = validateIDPs({
      currentIdps: originalData.devIdps,
      updatedIdps: current.devIdps,
      applied: originalData.applied,
      bceidApproved: originalData.bceidApproved,
      githubApproved: originalData.githubApproved,
      bcServicesCardApproved: originalData.bcServicesCardApproved,
      protocol: current.protocol,
      isAdmin: userIsAdmin,
    });
    if (!validIDPSelection) {
      throw new createHttpError[400]('Invalid IDP Selection');
    }

    // IDP approvers are not allowed to update other fields except approved flag if request doesn't belong to them
    if (
      !userIsAdmin &&
      (bceidApprover || githubApprover || bcscApprover || socialApprover) &&
      !(await canUpdateRequestByUserId(session?.user?.id as number, data?.id!))
    ) {
      Object.assign(current, {
        ...originalData,
        bceidApproved: bceidApprover ? data.bceidApproved : originalData.bceidApproved,
        githubApproved: githubApprover ? data.githubApproved : originalData.githubApproved,
        bcServicesCardApproved: bcscApprover ? data.bcServicesCardApproved : originalData.bcServicesCardApproved,
        socialApproved: socialApprover ? data.socialApproved : originalData.socialApproved,
      });
    }

    const allowedTeams = await getAllowedTeams(user, { raw: true });

    current.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    let finalData = getCurrentValue();
    let changes = null;

    if (submit) {
      const validationErrors = await validateRequest(mergedData, originalData, allowedTeams, isMerged);
      if (!isEmpty(validationErrors)) {
        if (isString(validationErrors)) throw new createHttpError.BadRequest(validationErrors);
        else
          throw new createHttpError.BadRequest(
            JSON.stringify({ validationError: true, errors: validationErrors, prepared: mergedData }),
          );
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
            throw new createHttpError.BadRequest(
              `${current.clientId} already exists, please choose a different client id`,
            );
        }
      }
      current.status = 'submitted';
      let environments = current.environments.concat();

      const hasProd = environments.includes('prod');
      addingProd = !originalData.environments.includes('prod') && hasProd;

      const hasBceid = usesBceid(current);
      const hasBceidProd = hasBceid && hasProd;

      const hasGithub = usesGithub(current);
      const hasGithubProd = hasGithub && hasProd;

      const hasBcServicesCard = usesBcServicesCard(current);
      const hasBcServicesCardProd = hasBcServicesCard && hasProd;

      const hasSocial = usesSocial(current);
      const hasSocialProd = hasSocial && hasProd;

      const waitingBceidProdApproval = hasBceidProd && !current.bceidApproved;
      const waitingGithubProdApproval = hasGithubProd && !current.githubApproved;
      const waitingBcServicesCardProdApproval = hasBcServicesCardProd && !current.bcServicesCardApproved;
      const waitingSocialProdApproval = hasSocialProd && !current.socialApproved;

      const removingBcscIdp =
        originalData.devIdps.includes('bcservicescard') && !current.devIdps.includes('bcservicescard');

      current.requester = await getRequester(session, current.id);

      finalData = getCurrentValue();
      const emails: { code: string; data: any }[] = [];
      changes = getDifferences(finalData, originalData);

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
        } else if (isApprovingBCSC) {
          emails.push({
            code: EMAILS.PROD_APPROVED,
            data: { integration: finalData, type: 'BC Services Card' },
          });
        } else if (isApprovingSocial) {
          emails.push({
            code: EMAILS.PROD_APPROVED,
            data: { integration: finalData, type: 'Social' },
          });
        } else {
          emails.push({
            code: EMAILS.UPDATE_INTEGRATION_SUBMITTED,
            data: {
              integration: finalData,
              waitingBceidProdApproval,
              waitingGithubProdApproval,
              waitingBcServicesCardProdApproval,
              waitingSocialProdApproval,
              changes,
              addingProd,
            },
          });
        }

        if (removingBcscIdp) {
          emails.push({
            code: EMAILS.DISABLE_BCSC_IDP,
            data: { integration: finalData },
          });
        }
      } else {
        emails.push({
          code: EMAILS.CREATE_INTEGRATION_SUBMITTED,
          data: {
            integration: finalData,
            waitingBceidProdApproval,
            waitingGithubProdApproval,
            waitingBcServicesCardProdApproval,
            waitingSocialProdApproval,
          },
        });
      }
      await sendTemplates(emails);
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
      const eventData: any = {
        eventCode: EVENTS.REQUEST_CREATE_SUCCESS,
        requestId: id,
        userId: session?.user?.id as number,
        idirUserDisplayName,
      };

      if (isMerged) {
        const details: any = { changes };
        if (userIsAdmin && comment) details.comment = comment;

        eventData.eventCode = EVENTS.REQUEST_UPDATE_SUCCESS;
        eventData.details = details;
      }

      await createEvent(eventData);
      const a = await processIntegrationRequest(updated, false, existingClientId, addingProd);

      updated = await getAllowedRequest(session, data?.id!);
    }

    return updated.get({ plain: true });
  } catch (err) {
    console.log(err);
    if (submit) {
      const eventData = {
        eventCode: isMerged ? EVENTS.REQUEST_UPDATE_FAILURE : EVENTS.REQUEST_CREATE_FAILURE,
        requestId: id,
        userId: session?.user?.id as number,
        idirUserDisplayName,
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
    const current = await getAllowedRequest(session, id);
    const getCurrentValue = () => current.get({ plain: true, clone: true });
    const isAllowedStatus = ['submitted'].includes(current.status);

    if (!current || !isAllowedStatus) {
      throw new createHttpError.BadRequest('Request not found or not in draft or applied status');
    }

    current.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    current.requester = await getRequester(session, current.id);
    current.changed('updatedAt', true);

    await processIntegrationRequest(getCurrentValue());

    const updated = await current.save();
    if (!updated) {
      throw new createHttpError.UnprocessableEntity('update failed');
    }

    return updated.get({ plain: true });
  } catch (err) {
    console.log(err);
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
    const current = await getAllowedRequest(session, id);
    const getCurrentValue = () => current.get({ plain: true, clone: true });
    const isAllowedStatus = ['submitted'].includes(current.status);

    if (!current || (!isAllowedStatus && !current.archived)) {
      throw new createHttpError.BadRequest('Request not found or in invalid state');
    }
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

    await processIntegrationRequest(current, true);

    const updated = await current.save();
    if (!updated) {
      throw new createHttpError.UnprocessableEntity('update failed');
    }

    const int = getCurrentValue();

    const dbRoles: NewRole[] = (await getRolesWithEnvironments(int.id)) as NewRole[];

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

    await sendTemplate(EMAILS.RESTORE_INTEGRATION, {
      integration: int,
      hasClientSecret: !int.publicAccess || ['both', 'service-account'].includes(int.authType),
    });

    return updated.get({ plain: true });
  } catch (err) {
    console.log(err);
    throw new createHttpError.UnprocessableEntity((err as any).message || err);
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
  let where = null;
  const { order, limit, page, ...rest } = data;
  const allowedIdpsForApprover = getAllowedIdpsForApprover(session);

  if (isAdmin(session)) {
    where = getWhereClauseForAllRequests({ ...rest });
  } else if (allowedIdpsForApprover.length > 0) {
    where = getWhereClauseForAllRequests({ ...rest, devIdps: allowedIdpsForApprover });
  } else {
    throw new createHttpError.Forbidden('not allowed');
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

export const getRequests = async (session: Session, user: User, include: string = 'active') => {
  const where: any = getBaseWhereForMyOrTeamIntegrations(session?.user?.id as number);
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
      include: [[sequelize.literal(getUserTeamRole(session?.user?.id as number)), 'userTeamRole']],
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
      throw new createHttpError.NotFound(`request #${id} not found`);
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
      userId: session?.user?.id as number,
      idirUserDisplayName: user?.displayName,
    });

    return integration;
  } catch (err) {
    console.log(err);

    createEvent({
      eventCode: EVENTS.REQUEST_DELETE_FAILURE,
      requestId: id,
      userId: session?.user?.id as number,
    });
    throw new createHttpError.UnprocessableEntity((err as any).message || err);
  }
};

export const updateRequestMetadata = async (session: Session, user: User, data: { id: number; status: string }) => {
  if (!session.client_roles?.includes('sso-admin')) {
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

export const isAllowedToDeleteIntegration = async (session: Session, integrationId: number) => {
  if (isAdmin(session)) return true;
  const integration = await getMyOrTeamRequest(session?.user?.id as number, integrationId);
  return canDeleteIntegration(integration);
};

export const buildGitHubRequestData = (baseData: IntegrationData) => {
  const hasBceid = usesBceid(baseData);
  const hasGithub = usesGithub(baseData);
  const hasBCSC = usesBcServicesCard(baseData);
  const hasSocial = usesSocial(baseData);

  // let's use dev's idps until having a env-specific idp selections
  if (baseData?.environments?.includes('test')) baseData.testIdps = baseData.devIdps;
  if (baseData?.environments?.includes('prod')) baseData.prodIdps = baseData.devIdps;

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

  return baseData;
};

export const processIntegrationRequest = async (
  integration: any,
  restore: boolean = false,
  existingClientId: string = '',
  addingProd: boolean = false,
) => {
  if (integration instanceof models.request) {
    integration = integration.get({ plain: true, clone: true });
  }

  integration = buildGitHubRequestData(integration);

  const idps = integration.devIdps;

  const payload = pick(integration, allowedFieldsForGithub);
  payload.accountableEntity = (await getAccountableEntity(integration)) || '';
  payload.idpNames = idps || [];

  if (payload.serviceType === 'gold') {
    const hasDigitalCredential = usesDigitalCredential(integration);
    const browserFlowAlias = hasDigitalCredential ? 'client stopper' : 'idp stopper';

    payload.browserFlowOverride = browserFlowAlias;
  }

  if (['development', 'production'].includes(process.env.NODE_ENV)) {
    return await standardClients(payload, restore, existingClientId, addingProd);
  }
};

export const standardClients = async (
  integration: IntegrationData,
  restore: boolean = false,
  existingClientId: string = '',
  addingProd: boolean = false,
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
      (integration?.environments as string[]).map((env: string) => keycloakClient(env, integration, existingClientId)),
    );
    for (const res of responses) {
      if (!res) {
        throw new createHttpError.UnprocessableEntity('Unable to create client at keycloak');
      }
    }
  } catch (err) {
    console.error(err);
    await createEvent({
      eventCode: restore ? EVENTS.REQUEST_RESTORE_FAILURE : EVENTS.REQUEST_APPLY_FAILURE,
      requestId: integration.id,
    });
    await models.request.update({ status: 'applyFailed' }, { where: { id: integration?.id } });
    return false;
  }

  await createEvent({
    eventCode: restore ? EVENTS.REQUEST_RESTORE_SUCCESS : EVENTS.REQUEST_APPLY_SUCCESS,
    requestId: integration.id,
  });
  await models.request.update({ status: 'applied' }, { where: { id: integration.id } });
  // delete from the queue
  await models.requestQueue.destroy({ where: { id: queueItem.id } });
  if (!restore) await updatePlannedIntegration(integration, addingProd);
  return true;
};

export const updatePlannedIntegration = async (integration: IntegrationData, addingProd: boolean = false) => {
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
    const hasProd = integration?.environments?.includes('prod');
    const hasBceid = usesBceid(integration);
    const hasGithub = usesGithub(integration);
    const hasSocial = usesSocial(integration);
    const hasBcServicesCard = usesBcServicesCard(integration);
    const waitingBceidProdApproval = hasBceid && hasProd && !integration.bceidApproved;
    const waitingGithubProdApproval = hasGithub && hasProd && !integration.githubApproved;
    const waitingSocialProdApproval = hasSocial && hasProd && !integration.socialApproved;
    const waitingBcServicesCardProdApproval = hasBcServicesCard && hasProd && !integration.bcServicesCardApproved;

    const emailCode = isUpdate ? EMAILS.UPDATE_INTEGRATION_APPLIED : EMAILS.CREATE_INTEGRATION_APPLIED;
    await sendTemplate(emailCode, {
      integration,
      waitingBceidProdApproval,
      hasBceid,
      waitingGithubProdApproval,
      waitingBcServicesCardProdApproval,
      waitingSocialProdApproval,
      addingProd,
    });
  }
};

export const retryFailedRequests = async () => {
  const REQUEST_QUEUE_INTERVAL_SECONDS = 60;
  const MAX_ATTEMPTS = 5;
  try {
    const requestQueue = await models.requestQueue.findAll();
    if (requestQueue.length === 0) {
      console.info('Request queue empty, exiting.');
    }

    for (const queuedRequest of requestQueue) {
      if (queuedRequest.attempts >= MAX_ATTEMPTS) {
        console.info(`request ${queuedRequest.request.clientId} at maximum attempts. Skipping.`);
        continue;
      }

      // Only act on queued items more than a minute old to prevent potential duplication.
      const requestQueueSecondsAgo = (new Date().getTime() - new Date(queuedRequest.createdAt).getTime()) / 1000;
      if (requestQueueSecondsAgo < REQUEST_QUEUE_INTERVAL_SECONDS) continue;

      console.info(`processing queued request ${queuedRequest.request.id}`);
      const { existingClientId, ...request } = queuedRequest.request;

      // Handle client update for each env
      const environmentPromises = queuedRequest.request.environments.map((env: string) =>
        keycloakClient(env, request, existingClientId),
      );
      const envResults = await Promise.all(environmentPromises);

      const allEnvironmentsSucceeded = envResults.every((result) => result);
      const sendEmail = queuedRequest.action !== ACTION_TYPES.DELETE;

      // Update DB, create event and send email based on keycloak results.
      if (allEnvironmentsSucceeded) {
        await models.request.update({ status: 'applied' }, { where: { id: queuedRequest.requestId } });
        await models.requestQueue.destroy({ where: { id: queuedRequest.id } });
        await createEvent({ eventCode: EVENTS.REQUEST_APPLY_SUCCESS, requestId: request.id });
        if (sendEmail) await updatePlannedIntegration(request);
      } else {
        await models.requestQueue.update({ attempts: queuedRequest.attempts + 1 }, { where: { id: queuedRequest.id } });
        await models.request.update({ status: 'applyFailed' }, { where: { id: queuedRequest.requestId } });
        await createEvent({ eventCode: EVENTS.REQUEST_APPLY_FAILURE, requestId: request.id });
      }
      if (queuedRequest.attempts >= MAX_ATTEMPTS - 1) {
        let message = `Request ${queuedRequest.request.clientId} has reached maximum retries and requires manual intervention.`;
        if (process.env.NODE_ENV === 'development') {
          message = 'SANDBOX: ' + message;
        }
        await axios.post(
          process.env.RC_SSO_OPS_WEBHOOK || '',
          { projectName: 'request_queue', message },
          { headers: { Accept: 'application/json' } },
        );
      }
    }
  } catch (err) {
    console.error(err);
  }
};

export const getListOfDescrepencies = async () => {
  const header = `**${
    process.env.APP_ENV === 'production' ? '' : '[SANDBOX] '
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
        process.env.APP_ENV === 'production' ? '' : '[SANDBOX] '
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

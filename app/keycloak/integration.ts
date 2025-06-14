import ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation';
import { getAdminClient } from './adminClient';
import { IntegrationData } from '@app/shared/interfaces';
import AuthenticationFlowRepresentation from '@keycloak/keycloak-admin-client/lib/defs/authenticationFlowRepresentation';
import { models } from '@app/shared/sequelize/models/models';
import { createBCSCIntegration, deleteBCSCIntegration } from '@app/controllers/requests';
import { usesBcServicesCard } from '@app/helpers/integration';
import axios from 'axios';
import createHttpError from 'http-errors';
import { getByRequestId } from '@app/queries/bcsc-client';

const realm = 'standard';

export const openIdClientProfile = (
  integration: IntegrationData,
  environment: string,
  authFlows: AuthenticationFlowRepresentation[],
): ClientRepresentation => {
  const clientName = integration[`${environment}LoginTitle` as keyof IntegrationData] || '';
  const accessTokenLifespan = integration[`${environment}AccessTokenLifespan` as keyof IntegrationData] || '';
  const sessionIdleTimeout = integration[`${environment}SessionIdleTimeout` as keyof IntegrationData] || '';
  const sessionMaxLifespan = integration[`${environment}SessionMaxLifespan` as keyof IntegrationData] || '';
  const offlineSessionIdleTimeout =
    integration[`${environment}OfflineSessionIdleTimeout` as keyof IntegrationData] || '';
  const offlineSessionMaxLifespan =
    integration[`${environment}OfflineSessionMaxLifespan` as keyof IntegrationData] || '';
  const loginTheme = !integration[`${environment}DisplayHeaderTitle` as keyof IntegrationData]
    ? 'bcgov-idp-stopper-no-header-title'
    : '';
  const validRedirectUris = integration[`${environment}ValidRedirectUris` as keyof IntegrationData] || [];
  const pkceCodeChallengeMethod = integration.publicAccess ? 'S256' : '';

  let oidcClient: ClientRepresentation = {
    clientId: integration.clientId,
    name: clientName || integration.clientId,
    description: 'CSS App Created',
    protocol: 'openid-connect',
    attributes: {
      login_theme: loginTheme,
      'pkce.code.challenge.method': pkceCodeChallengeMethod,
      'access.token.lifespan': accessTokenLifespan,
      'client.offline.session.idle.timeout': offlineSessionIdleTimeout,
      'client.offline.session.max.lifespan': offlineSessionMaxLifespan,
      'client.session.idle.timeout': sessionIdleTimeout,
      'client.session.max.lifespan': sessionMaxLifespan,
    },
    enabled: true,
    standardFlowEnabled: ['browser-login', 'both'].includes(integration?.authType!),
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: ['service-account', 'both'].includes(integration?.authType!),
    publicClient: integration.publicAccess || false,
    redirectUris: validRedirectUris,
    webOrigins: validRedirectUris.concat('+'),
    fullScopeAllowed: false,
    authenticationFlowBindingOverrides: {
      browser: authFlows.find((flow) => flow.alias === integration.browserFlowOverride)?.id || '',
      direct_grant: '',
    },
  };
  return oidcClient;
};

export const samlClientProfile = (
  integration: IntegrationData,
  environment: string,
  authFlows: AuthenticationFlowRepresentation[],
) => {
  const validRedirectUris = integration[`${environment}ValidRedirectUris` as keyof IntegrationData] || [];
  const clientName = integration[`${environment}LoginTitle` as keyof IntegrationData] || '';
  const assertionLifespan = integration[`${environment}AssertionLifespan` as keyof IntegrationData] || '';
  const logoutPostBindingUri = integration[`${environment}SamlLogoutPostBindingUri` as keyof IntegrationData] || '';
  const signAssertions = integration[`${environment}SamlSignAssertions` as keyof IntegrationData] || false;
  const loginTheme = !integration[`${environment}DisplayHeaderTitle` as keyof IntegrationData]
    ? 'bcgov-idp-stopper-no-header-title'
    : '';

  let samlClient: ClientRepresentation = {
    clientId: integration.clientId,
    name: clientName || integration.clientId,
    description: 'CSS App Created',
    protocol: 'saml',
    attributes: {
      login_theme: loginTheme,
      'saml.authnstatement': true,
      'saml.server.signature': true,
      'saml.assertion.signature': signAssertions,
      'saml.force.post.binding': true,
      saml_name_id_format: 'username',
      'saml.assertion.lifespan': assertionLifespan,
      saml_single_logout_service_url_post: logoutPostBindingUri,
      'saml.client.signature': false,
    },
    enabled: true,
    frontchannelLogout: true,
    redirectUris: validRedirectUris,
    fullScopeAllowed: false,
    authenticationFlowBindingOverrides: {
      browser: authFlows.find((flow) => flow.alias === integration.browserFlowOverride)?.id || '',
      direct_grant: '',
    },
  };
  return samlClient;
};

/** Client scopes to add when social is selected. */
export const socialIdps = ['google', 'microsoft', 'apple'];

export const getDefaultClientScopes = (integration: IntegrationData, environment: string) => {
  let defaultScopes = integration.protocol === 'oidc' ? ['common', 'profile', 'email'] : ['common'];

  // BCSC and Social client scopes are not the same as the IDP name and need to be handled individually.
  let otherIdpScopes =
    integration[`${environment}Idps` as keyof IntegrationData]?.filter((idp: string) => {
      return !['bcservicescard', 'social'].includes(idp);
    }) || [];

  if (integration[`${environment}Idps` as keyof IntegrationData].includes('social')) {
    otherIdpScopes = otherIdpScopes.concat(socialIdps);
  }

  if (integration.protocol === 'oidc') {
    defaultScopes = defaultScopes.concat(otherIdpScopes);
  } else {
    defaultScopes = defaultScopes.concat(otherIdpScopes).map((idp: string) => `${idp}-saml`);
  }
  // BCSC client scope is named after the client id on bcsc side
  if (
    usesBcServicesCard(integration) &&
    integration[`${environment}Idps` as keyof IntegrationData].includes('bcservicescard')
  ) {
    defaultScopes.push(integration?.clientId!);
  }
  return defaultScopes;
};

export const keycloakClient = async (
  environment: string,
  integration: IntegrationData,
  existingClientId: string = '',
) => {
  try {
    let client;
    const offlineAccessEnabled = integration[`${environment}OfflineAccessEnabled` as keyof IntegrationData] || false;
    if (isPreservedClaim(integration?.additionalRoleAttribute!?.trim())) {
      throw new createHttpError.BadRequest(
        `${integration.additionalRoleAttribute} is a preserved claim and cannot be overwritten`,
      );
    }

    const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });

    // check if client exists
    let clients = await kcAdminClient.clients.find({
      realm,
      clientId: existingClientId || integration.clientId,
      max: 1,
    });

    const realmRoleForClient = await kcAdminClient.roles.findOneByName({
      realm,
      name: `client-${integration.clientId}`,
    });

    if (integration.archived) {
      if (clients.length > 0) {
        if (usesBcServicesCard(integration)) {
          const bcscClientDetails = await getByRequestId(integration?.id!, environment);
          if (bcscClientDetails) await deleteBCSCIntegration(bcscClientDetails, integration?.clientId!);
        }
        // delete the client
        await kcAdminClient.clients.del({ id: clients[0]?.id!, realm });
      }

      if (realmRoleForClient) {
        // delete realm role
        await kcAdminClient.roles.delByName({
          realm,
          name: `client-${integration.clientId}`,
        });
      }

      return true;
    }

    if (usesBcServicesCard(integration)) {
      await createBCSCIntegration(environment, integration, integration?.userId!);
    }

    const authenticationFlows = await axios.get(`${kcAdminClient.baseUrl}/admin/realms/standard/authentication/flows`, {
      headers: {
        Authorization: `Bearer ${kcAdminClient.accessToken}`,
      },
    });

    // build client profile
    const clientData =
      integration.protocol === 'oidc'
        ? openIdClientProfile(integration, environment, authenticationFlows.data)
        : samlClientProfile(integration, environment, authenticationFlows.data);

    const defaultScopes = getDefaultClientScopes(integration, environment);
    if (clients.length === 0) {
      // if client does not exist then just create client
      client = await kcAdminClient.clients.create({ realm, ...clientData });
    } else {
      // if client exists then just update
      client = clients[0];
      await kcAdminClient.clients.update({ id: client?.id!, realm }, { ...clientData });
    }

    const protocolMappersForClient = await kcAdminClient.clients.listProtocolMappers({
      id: client?.id!,
      realm,
    });

    if (!integration.apiServiceAccount) {
      // check existing roles
      const existingRoles = (await kcAdminClient.clients.listRoles({ id: client?.id!, realm })).map(
        (role) => role.name,
      );

      const roles = integration[`${environment}Roles` as keyof IntegrationData] || [];

      // filter existing roles
      for (const role of roles.filter((n: string) => !existingRoles.includes(n))) {
        // create role
        await kcAdminClient.roles.create({
          name: role,
          clientRole: true,
          realm,
          description: role,
        });
      }

      const clientScopeList = await kcAdminClient.clientScopes.find({ realm });

      const existingDefaultScopes = (
        await kcAdminClient.clients.listDefaultClientScopes({
          id: client?.id!,
          realm,
        })
      ).map((scope) => scope.name);

      for (const scope of existingDefaultScopes) {
        if (!defaultScopes?.includes(scope as string)) {
          await kcAdminClient.clients.delDefaultClientScope({
            id: client?.id!,
            clientScopeId: clientScopeList?.find((defaultClientscope) => defaultClientscope.name === scope)?.id!,
            realm,
          });
        }
      }
      for (const scope of defaultScopes.filter((n: string) => !existingDefaultScopes.includes(n))) {
        await kcAdminClient.clients.addDefaultClientScope({
          id: client?.id!,
          clientScopeId: clientScopeList?.find((defaultClientscope) => defaultClientscope.name === scope)?.id!,
          realm,
        });
      }

      const existingOptionalScopes = (
        await kcAdminClient.clients.listOptionalClientScopes({
          id: client?.id!,
          realm,
        })
      ).map((scope) => scope.name);

      if (offlineAccessEnabled && !existingOptionalScopes.includes('offline_access')) {
        await kcAdminClient.clients.addOptionalClientScope({
          id: client?.id!,
          clientScopeId: clientScopeList?.find((defaultClientscope) => defaultClientscope.name === 'offline_access')
            ?.id!,
          realm,
        });
      } else if (existingOptionalScopes.includes('offline_access') && !offlineAccessEnabled) {
        await kcAdminClient.clients.delOptionalClientScope({
          id: client?.id!,
          clientScopeId: clientScopeList?.find((defaultClientscope) => defaultClientscope.name === 'offline_access')
            ?.id!,
          realm,
        });
      }

      if (!realmRoleForClient) {
        await kcAdminClient.roles.create({
          name: `client-${integration.clientId}`,
          clientRole: false,
          realm,
          description: `Role for client: ${integration.clientId}`,
        });
      }

      if (integration.protocol === 'oidc') {
        if (!protocolMappersForClient.find((mapper) => mapper.name === 'client_roles')) {
          await kcAdminClient.clients.addProtocolMapper(
            {
              id: client?.id!,
              realm,
            },
            {
              name: 'client_roles',
              protocol: 'openid-connect',
              protocolMapper: 'oidc-usermodel-client-role-mapper',
              config: {
                'claim.name': 'client_roles',
                'jsonType.label': 'String',
                'usermodel.clientRoleMapping.clientId': integration.clientId,
                'id.token.claim': 'true',
                'access.token.claim': 'true',
                'userinfo.token.claim': 'true',
                multivalued: 'true',
              },
            },
          );
        }

        if (!protocolMappersForClient.find((mapper) => mapper.name === 'access_token_aud')) {
          await kcAdminClient.clients.addProtocolMapper(
            {
              id: client?.id!,
              realm,
            },
            {
              name: 'access_token_aud',
              protocol: 'openid-connect',
              protocolMapper: 'oidc-audience-mapper',
              config: {
                'included.client.audience': integration.clientId,
                'id.token.claim': 'false',
                'access.token.claim': 'true',
              },
            },
          );
        }

        const additionalClientRolesMapper = protocolMappersForClient.find(
          (mapper) => mapper.name === 'additional_client_roles',
        );
        if (integration.additionalRoleAttribute) {
          const mapperPayload = {
            name: 'additional_client_roles',
            protocol: 'openid-connect',
            protocolMapper: 'oidc-usermodel-client-role-mapper',
            config: {
              'claim.name': integration.additionalRoleAttribute,
              'jsonType.label': 'String',
              'usermodel.clientRoleMapping.clientId': integration.clientId,
              'id.token.claim': 'true',
              'access.token.claim': 'true',
              'userinfo.token.claim': 'true',
              multivalued: 'true',
            },
          };
          if (!additionalClientRolesMapper) {
            await kcAdminClient.clients.addProtocolMapper(
              {
                id: client?.id!,
                realm,
              },
              {
                ...mapperPayload,
              },
            );
          } else if (
            additionalClientRolesMapper &&
            additionalClientRolesMapper?.config!['claim.name'] !== integration?.additionalRoleAttribute
          ) {
            await kcAdminClient.clients.updateProtocolMapper(
              {
                id: client?.id!,
                realm,
                mapperId: additionalClientRolesMapper?.id!,
              },
              { ...mapperPayload, id: additionalClientRolesMapper.id },
            );
          }
        } else if (!integration.additionalRoleAttribute && additionalClientRolesMapper) {
          await kcAdminClient.clients.delProtocolMapper({
            id: client?.id!,
            realm,
            mapperId: additionalClientRolesMapper?.id!,
          });
        }
      } else if (
        integration.protocol === 'saml' &&
        integration.additionalRoleAttribute &&
        !protocolMappersForClient.find((mapper) => mapper.name === 'additional_client_roles')
      ) {
        await kcAdminClient.clients.addProtocolMapper(
          {
            id: client?.id!,
            realm,
          },
          {
            name: 'additional_client_roles',
            protocol: 'saml',
            protocolMapper: 'saml-client-role-list-mapper',
            config: {
              'attribute.name': integration.additionalRoleAttribute,
              single: 'true',
            },
          },
        );
      }
    } else if (!protocolMappersForClient.find((mapper) => mapper.name === 'team')) {
      await kcAdminClient.clients.addProtocolMapper(
        {
          id: client?.id!,
          realm,
        },
        {
          name: 'team',
          protocol: 'openid-connect',
          protocolMapper: 'oidc-hardcoded-claim-mapper',
          config: {
            'access.token.claim': 'true',
            'access.tokenResponse.claim': 'false',
            'claim.name': 'team',
            'claim.value': integration.teamId,
            'id.token.claim': 'true',
            'userinfo.token.claim': 'true',
          },
        },
      );
    }

    return true;
  } catch (err) {
    console.error(err);
    console.trace('Failed to apply integration', (err as Error).message || err);
    return false;
  }
};

const isPreservedClaim = (claim: string) => {
  const PRESERVED_CLAIMS = [
    'exp',
    'iat',
    'auth_time',
    'jti',
    'iss',
    'aud',
    'sub',
    'typ',
    'azp',
    'nonce',
    'session_state',
    'sid',
    'email_verified',
    'name',
    'preferred_username',
    'display_name',
    'given_name',
    'family_name',
    'email',
    'scope',
    'at_hash',
  ];
  return PRESERVED_CLAIMS.includes(claim);
};

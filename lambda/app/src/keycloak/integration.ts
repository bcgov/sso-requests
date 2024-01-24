import ClientRepresentation from 'keycloak-admin/lib/defs/clientRepresentation';
import { getAdminClient } from './adminClient';
import { IntegrationData } from '@lambda-shared/interfaces';
import AuthenticationFlowRepresentation from 'keycloak-admin/lib/defs/authenticationFlowRepresentation';
import { models } from '@lambda-shared/sequelize/models/models';
import { createEvent } from '@lambda-app/controllers/requests';
import { ACTION_TYPES, EMAILS, EVENTS, REQUEST_TYPES } from '@lambda-shared/enums';
import { getTeamById } from '@lambda-app/queries/team';
import { sendTemplate } from '@lambda-shared/templates';
import { usesBceid, usesGithub, usesDigitalCredential } from '@app/helpers/integration';
import axios from 'axios';

const realm = 'standard';

export const openIdClientProfile = (
  integration: IntegrationData,
  environment: string,
  authFlows: AuthenticationFlowRepresentation[],
): ClientRepresentation => {
  const clientName = integration[`${environment}LoginTitle`] || '';
  const accessTokenLifespan = integration[`${environment}AccessTokenLifespan`] || '';
  const sessionIdleTimeout = integration[`${environment}SessionIdleTimeout`] || '';
  const sessionMaxLifespan = integration[`${environment}SessionMaxLifespan`] || '';
  const offlineSessionIdleTimeout = integration[`${environment}OfflineSessionIdleTimeout`] || '';
  const offlineSessionMaxLifespan = integration[`${environment}OfflineSessionMaxLifespan`] || '';
  const loginTheme = !integration[`${environment}DisplayHeaderTitle`] ? 'bcgov-idp-stopper-no-header-title' : '';
  const validRedirectUris = integration[`${environment}ValidRedirectUris`] || [];
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
    standardFlowEnabled: ['browser-login', 'both'].includes(integration.authType),
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: ['service-account', 'both'].includes(integration.authType),
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
  const validRedirectUris = integration[`${environment}ValidRedirectUris`] || [];
  const clientName = integration[`${environment}LoginTitle`] || '';
  const assertionLifespan = integration[`${environment}AssertionLifespan`] || '';
  const logoutPostBindingUri = integration[`${environment}SamlLogoutPostBindingUri`] || '';
  const signAssertions = integration[`${environment}SamlSignAssertions`] || false;
  const loginTheme = !integration[`${environment}DisplayHeaderTitle`] ? 'bcgov-idp-stopper-no-header-title' : '';

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

export const keycloakClient = async (
  environment: string,
  integration: IntegrationData,
  existingClientId: string = '',
) => {
  try {
    let client;

    if (isPreservedClaim(integration.additionalRoleAttribute?.trim())) {
      throw Error(`${integration.additionalRoleAttribute} is a preserved claim and cannot be overwritten`);
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
        // delete the client
        await kcAdminClient.clients.del({ id: clients[0].id, realm });
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
    const defaultScopes =
      integration.protocol === 'oidc'
        ? ['common', 'profile', 'email'].concat(integration[`${environment}Idps`] || [])
        : ['common-saml'].concat(integration[`${environment}Idps`].map((idp: string) => `${idp}-saml`) || []);

    if (clients.length === 0) {
      // if client does not exist then just create client
      client = await kcAdminClient.clients.create({ realm, ...clientData });
    } else {
      // if client exists then just update
      client = clients[0];
      await kcAdminClient.clients.update({ id: client?.id, realm }, { ...clientData });
    }

    const protocolMappersForClient = (
      await kcAdminClient.clients.listProtocolMappers({
        id: client?.id,
        realm,
      })
    ).map((mapper) => mapper.name);

    if (!integration.apiServiceAccount) {
      // check existing roles
      const existingRoles = (await kcAdminClient.clients.listRoles({ id: client.id, realm })).map((role) => role.name);

      const roles = integration[`${environment}Roles`] || [];

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
          id: client?.id,
          realm,
        })
      ).map((scope) => scope.name);

      for (const scope of existingDefaultScopes) {
        if (!defaultScopes.includes(scope)) {
          await kcAdminClient.clients.delDefaultClientScope({
            id: client.id,
            clientScopeId: clientScopeList.find((defaultClientscope) => defaultClientscope.name === scope)?.id,
            realm,
          });
        }
      }

      for (const scope of defaultScopes.filter((n: string) => !existingDefaultScopes.includes(n))) {
        await kcAdminClient.clients.addDefaultClientScope({
          id: client.id,
          clientScopeId: clientScopeList.find((defaultClientscope) => defaultClientscope.name === scope)?.id,
          realm,
        });
      }

      const existingOptionalScopes = (
        await kcAdminClient.clients.listOptionalClientScopes({
          id: client.id,
          realm,
        })
      ).map((scope) => scope.name);

      if (existingOptionalScopes.includes('offline_access')) {
        await kcAdminClient.clients.addOptionalClientScope({
          id: client.id,
          clientScopeId: clientScopeList.find((defaultClientscope) => defaultClientscope.name === 'offline_access')?.id,
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
        if (!protocolMappersForClient.includes('client_roles')) {
          await kcAdminClient.clients.addProtocolMapper(
            {
              id: client.id,
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

        if (!protocolMappersForClient.includes('access_token_aud')) {
          await kcAdminClient.clients.addProtocolMapper(
            {
              id: client.id,
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

        if (integration.additionalRoleAttribute) {
          if (!protocolMappersForClient.includes('additional_client_roles')) {
            await kcAdminClient.clients.addProtocolMapper(
              {
                id: client.id,
                realm,
              },
              {
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
              },
            );
          }
        }
      } else if (integration.protocol === 'saml') {
        if (integration.additionalRoleAttribute) {
          if (!protocolMappersForClient.includes('additional_client_roles')) {
            await kcAdminClient.clients.addProtocolMapper(
              {
                id: client.id,
                realm,
              },
              {
                name: 'additional_client_roles',
                protocol: 'saml',
                protocolMapper: 'saml-client-role-list-mapper',
                config: {
                  'claim.name': integration.additionalRoleAttribute,
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
        }
      }
    } else {
      if (!protocolMappersForClient.includes('team')) {
        await kcAdminClient.clients.addProtocolMapper(
          {
            id: client.id,
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
    }

    return true;
  } catch (err) {
    console.trace('Failed to apply integration', err.message || err);
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

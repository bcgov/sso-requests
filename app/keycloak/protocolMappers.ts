import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import ProtocolMapperRepresentation from '@keycloak/keycloak-admin-client/lib/defs/protocolMapperRepresentation';

export const listClientProtocolMappers = async (
  kcAdminClient: KeycloakAdminClient,
  clientId: string,
  realm: string,
) => {
  return await kcAdminClient.clients.listProtocolMappers({
    id: clientId!,
    realm,
  });
};

export const createClientRolesMapper = async (kcAdminClient: KeycloakAdminClient, clientId: string, realm: string) => {
  try {
    await kcAdminClient.clients.addProtocolMapper(
      {
        id: clientId,
        realm,
      },
      {
        name: 'client_roles',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-client-role-mapper',
        config: {
          'claim.name': 'client_roles',
          'jsonType.label': 'String',
          'usermodel.clientRoleMapping.clientId': clientId,
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'userinfo.token.claim': 'true',
          multivalued: 'true',
        },
      },
    );
  } catch (err) {
    throw new Error('Failed to create client roles mapper');
  }
};

export const managePrivacyZoneMapper = async (
  kcAdminClient: KeycloakAdminClient,
  protocol: string,
  clientId: string,
  realm: string,
  privacyZoneUri: string,
  mapperId: string,
) => {
  let config: ProtocolMapperRepresentation = { name: 'privacy_zone' };
  try {
    if (protocol === 'oidc') {
      config = {
        ...config,
        protocol: 'openid-connect',
        protocolMapper: 'oidc-hardcoded-claim-mapper',
        config: {
          'access.token.claim': 'false',
          'access.tokenResponse.claim': 'false',
          'claim.name': 'privacy_zone',
          'claim.value': privacyZoneUri,
          'id.token.claim': 'false',
          'introspection.token.claim': 'false',
          'jsonType.label': 'String',
          'lightweight.claim': 'false',
          'userinfo.token.claim': 'false',
        },
      };
    } else {
      config = {
        ...config,
        protocol: 'saml',
        protocolMapper: 'saml-hardcode-attribute-mapper',
        config: {
          'attribute.name': 'privacy_zone',
          'attribute.nameformat': 'Basic',
          'attribute.value': privacyZoneUri,
          'friendly.name': config.name,
        },
      };
    }

    if (!mapperId) {
      await kcAdminClient.clients.addProtocolMapper(
        {
          id: clientId,
          realm,
        },
        config,
      );
    } else {
      await kcAdminClient.clients.updateProtocolMapper(
        {
          id: clientId,
          realm,
          mapperId,
        },
        { ...config, id: mapperId },
      );
    }
  } catch (err) {
    throw new Error('Failed to create privacy_zone mapper');
  }
};

export const createPpidMapper = async (
  kcAdminClient: KeycloakAdminClient,
  protocol: string,
  clientId: string,
  realm: string,
) => {
  let config: ProtocolMapperRepresentation = { name: 'ppid' };
  try {
    if (protocol === 'oidc') {
      config = {
        ...config,
        protocol: 'openid-connect',
        protocolMapper: 'oidc-idp-ppid-mapper',
        config: {
          'access.token.claim': 'true',
          'claim.name': 'sub',
          'id.token.claim': 'true',
          'introspection.token.claim': 'true',
          'lightweight.claim': 'false',
          'userinfo.token.claim': 'true',
        },
      };
    } else {
      config = {
        ...config,
        protocol: 'saml',
        protocolMapper: 'saml-ppid-nameid-mapper',
        config: {
          'nameid.format': 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
        },
      };
    }

    await kcAdminClient.clients.addProtocolMapper(
      {
        id: clientId,
        realm,
      },
      config,
    );
  } catch (err) {
    throw new Error('Failed to create ppid mapper');
  }
};

export const createTeamMapper = async (
  kcAdminClient: KeycloakAdminClient,
  clientId: string,
  realm: string,
  teamId: string,
) => {
  try {
    await kcAdminClient.clients.addProtocolMapper(
      {
        id: clientId,
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
          'claim.value': teamId,
          'id.token.claim': 'true',
          'userinfo.token.claim': 'true',
        },
      },
    );
  } catch (err) {
    throw new Error('Failed to create team mapper');
  }
};

export const createAdditionalClientRolesMapper = async (
  kcAdminClient: KeycloakAdminClient,
  protocol: string,
  clientId: string,
  realm: string,
  additionalRoleAttribute: string,
) => {
  try {
    let config: ProtocolMapperRepresentation = { name: 'additional_client_roles' };
    if (protocol === 'oidc') {
      config = {
        ...config,
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-client-role-mapper',
        config: {
          'claim.name': additionalRoleAttribute,
          'jsonType.label': 'String',
          'usermodel.clientRoleMapping.clientId': clientId,
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'userinfo.token.claim': 'true',
          multivalued: 'true',
        },
      };
    } else {
      config = {
        ...config,
        protocol: 'saml',
        protocolMapper: 'saml-client-role-list-mapper',
        config: {
          'attribute.name': additionalRoleAttribute,
          single: 'true',
        },
      };
    }

    await kcAdminClient.clients.addProtocolMapper(
      {
        id: clientId,
        realm,
      },
      config,
    );
  } catch (err) {
    throw new Error('Failed to create additional client roles mapper');
  }
};

export const manageAdditionalClientRolesMapper = async (
  kcAdminClient: KeycloakAdminClient,
  protocol: string,
  clientId: string,
  realm: string,
  additionalRoleAttribute: string,
  mapperId: string,
) => {
  try {
    let config: ProtocolMapperRepresentation = { name: 'additional_client_roles' };
    if (protocol === 'oidc') {
      config = {
        ...config,
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-client-role-mapper',
        config: {
          'claim.name': additionalRoleAttribute,
          'jsonType.label': 'String',
          'usermodel.clientRoleMapping.clientId': clientId,
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'userinfo.token.claim': 'true',
          multivalued: 'true',
        },
      };
    } else {
      config = {
        ...config,
        protocol: 'saml',
        protocolMapper: 'saml-client-role-list-mapper',
        config: {
          'attribute.name': additionalRoleAttribute,
          single: 'true',
        },
      };
    }

    if (!mapperId) {
      await kcAdminClient.clients.addProtocolMapper(
        {
          id: clientId,
          realm,
        },
        config,
      );
    } else {
      await kcAdminClient.clients.updateProtocolMapper(
        {
          id: clientId,
          realm,
          mapperId,
        },
        { ...config, id: mapperId },
      );
    }
  } catch (err) {
    throw new Error('Failed to create additional client roles mapper');
  }
};

export const deleteMapper = async (
  kcAdminClient: KeycloakAdminClient,
  clientId: string,
  realm: string,
  mapperId: string,
) => {
  await kcAdminClient.clients.delProtocolMapper({
    id: clientId,
    realm,
    mapperId,
  });
};

export const createAccessTokenAudMapper = async (
  kcAdminClient: KeycloakAdminClient,
  clientId: string,
  realm: string,
) => {
  try {
    await kcAdminClient.clients.addProtocolMapper(
      {
        id: clientId,
        realm,
      },
      {
        name: 'access_token_aud',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-audience-mapper',
        config: {
          'included.client.audience': clientId,
          'id.token.claim': 'false',
          'access.token.claim': 'true',
        },
      },
    );
  } catch (err) {
    throw new Error('Failed to create access token aud mapper');
  }
};

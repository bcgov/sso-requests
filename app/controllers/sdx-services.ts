import type {
  SDXAccessRequest,
  SDXAllowedAccessUpdate,
  SDXAllowedAccessUpdateResult,
  Session,
} from '@app/shared/interfaces';
import { SDXResourceServer } from '@app/shared/interfaces';
import { getIntegrationById } from '@app/queries/request';
import { authorizeIntegration } from '@app/queries/integrationAccess';
import { audit } from '@app/queries/event';
import { getAdminClient } from '@app/keycloak/adminClient';
import { getClientScopes } from '@app/keycloak/clientScopes';
import { createSdxAccessRequest } from '@app/queries/sdx-services';
import { Integration } from '@app/interfaces/Request';
import { getUserById } from '@app/queries/user';
import { getPrivacyZoneURI } from '@app/utils/bcsc-client';
import { SDX_ENVIRONMENTS } from '@app/utils/constants';
import ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation';

import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'controllers/sdx-services' });

const tokenExchangerClientId = process.env.SDX_TOKEN_EXCH_CLIENT_ID || 'sdx-rg-pzgw';

const getSdxEnvironments = () => {
  return process.env.NEXT_PUBLIC_APP_ENV === 'production'
    ? SDX_ENVIRONMENTS['production']
    : SDX_ENVIRONMENTS['sandbox'];
};

const isProductionSdxEnvironment = (environment: string) => environment === getSdxEnvironments().production;

const keycloakEnvironmentsForSdxEnvironment = (environment: string) => {
  const configured = getSdxEnvironments();
  if (environment === configured.production) return ['prod'];
  if (environment === configured['non-production']) return ['dev', 'test'];
  throw new Error(`Unsupported SDX environment '${environment}'`);
};

const getScopeLabel = (scope: SDXResourceServer['services'][number]['scopes'][number]) =>
  typeof scope === 'string' ? scope : scope.label;

const getToken = async () => {
  return await fetch(process.env.SDX_TOKEN_URL || '', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SDX_CLIENT_ID || '',
      client_secret: process.env.SDX_CLIENT_SECRET || '',
    }),
  })
    .then((response) => response.json())
    .then((data) => data.access_token)
    .catch((error) => {
      log.error({ err: error }, 'Error fetching SDX token');
      throw new Error('Failed to fetch SDX token');
    });
};

export const getSdxServicesForClient = async (
  session: Session,
  requestId: number,
  status: string,
): Promise<{ clientId: string; resourceServers: SDXResourceServer[] }> => {
  const authorized = await authorizeIntegration(session, requestId, 'integrations:read');
  if (!authorized) throw new Error('Request not found');
  const { integration: current } = authorized;

  const envs = getSdxEnvironments();

  const data = {
    clientId: current.clientId,
    resourceServers: [] as SDXResourceServer[],
  };

  try {
    const token = await getToken();
    const resourceServersByEnvironment = await Promise.all(
      Object.values(envs).map((env) =>
        fetch(
          `${process.env.SDX_API || ''}/integrations/${
            current?.id
          }/allowed-services?environment=${env}&status=${status}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )
          .then((response) => response.json())
          .then((response) => response.resourceServers as SDXResourceServer[]),
      ),
    );
    data.resourceServers.push(...resourceServersByEnvironment.flat());
    return data;
  } catch (err) {
    log.error({ err }, 'Error fetching SDX services');
    throw new Error('Failed to fetch SDX services');
  }
};

export const listSdxResourceServers = async (): Promise<SDXResourceServer[]> => {
  try {
    const token = await getToken();
    const resourceServersByEnvironment = await Promise.all(
      Object.values(getSdxEnvironments()).map(async (env) => {
        const response = await fetch(`${process.env.SDX_API || ''}/resource-servers?environment=${env}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        return (await response.json()) as SDXResourceServer[];
      }),
    );
    return resourceServersByEnvironment.flat();
  } catch (err) {
    log.error({ err }, 'Error fetching SDX resource servers');
    throw new Error('Failed to fetch SDX resource servers');
  }
};

type AdminClient = Awaited<ReturnType<typeof getAdminClient>>['kcAdminClient'];

// SDX grants its scopes as optional client scopes, so only those are ever removed. Default scopes are left alone.
const listOptionalClientScopeIds = async (kcAdminClient: AdminClient, id: string) => {
  const optionalScopes = await kcAdminClient.clients.listOptionalClientScopes({ id, realm: 'standard' });
  return new Map(optionalScopes.map((scope) => [scope.name!, scope.id!]));
};

const removeOptionalClientScopes = (
  kcAdminClient: AdminClient,
  id: string,
  optionalScopeIds: Map<string, string>,
  scopes: string[],
) =>
  Promise.all(
    scopes
      .filter((scope) => optionalScopeIds.has(scope))
      .map((scope) =>
        kcAdminClient.clients.delOptionalClientScope({
          id,
          realm: 'standard',
          clientScopeId: optionalScopeIds.get(scope)!,
        }),
      ),
  );

export const createSdxRequest = async (session: Session, request: Integration) => {
  try {
    if (!request.sdxServices) throw new Error('SDX services cannot be empty');
    const resourceServers = request.sdxServices.resourceServers || [];
    if (resourceServers.length === 0) throw new Error('SDX resource servers cannot be empty');

    const user = await getUserById(session.user?.id || 0, { raw: true });

    const privacyZoneUri = await getPrivacyZoneURI('prod', request.bcscPrivacyZone || '');
    const sdxRequestData = {
      ...request.sdxServices,
      requester: {
        displayName: user?.displayName || '',
        email: user?.idirEmail || '',
      },
      clientId: request.clientId || '',
      policyVersion: 'SDX.R1.00',
      privacyZone: privacyZoneUri,
    };

    // The access request row mirrors what SDX accepted, so it commits with the success event. The Keycloak
    // scope sync below follows it; a failure there fails the request but not the recorded SDX submission.
    await audit.runAuditedOperation(
      { action: 'sdx-request-create', requestId: request.id, details: { services: request.sdxServices } },
      async () => {
        const response = await fetch(`${process.env.SDX_API || ''}/integrations/${request.id!}/access-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getToken()}`,
          },
          body: JSON.stringify(sdxRequestData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create SDX request: ${errorText}`);
        }

        return response.json();
      },
      {
        onSuccess: (transaction, responseData) =>
          createSdxAccessRequest(
            responseData.submissionId || '',
            user?.displayName || '',
            request.id!,
            sdxRequestData,
            transaction,
          ),
        successDetails: (responseData) => ({ submissionId: responseData.submissionId }),
      },
    );

    await initializeScopes(resourceServers);
  } catch (error) {
    console.error('Error creating SDX request:', error);
    throw error;
  }

  return {
    success: true,
    message: 'SDX request created successfully',
    data: {
      requestId: request.id!,
      ...request.sdxServices,
    },
  };
};

const initializeScopes = async (resourceServers: SDXResourceServer[]) => {
  const sdxScopes: { [environment: string]: Set<string> } = {};

  for (const rs of resourceServers || []) {
    for (const service of rs.services || []) {
      if (service.scopes && service.scopes.length > 0) {
        for (const scope of service.scopes) {
          if (!sdxScopes[rs.environment]) {
            sdxScopes[rs.environment] = new Set();
          }
          sdxScopes[rs.environment].add(getScopeLabel(scope));
        }
      }
    }
  }

  await Promise.all(
    Object.entries(sdxScopes).map(([environment, scopes]) => {
      if (isProductionSdxEnvironment(environment)) {
        return keycloakSyncScopes('prod', 'standard', Array.from(scopes));
      }
      return Promise.all(['dev', 'test'].map((env) => keycloakSyncScopes(env, 'standard', Array.from(scopes))));
    }),
  );
};

const keycloakSyncScopes = async (environment: string, realmName: string, scopes: string[]) => {
  const existingScopes = await getClientScopes({ environment, realmName });
  const existingScopeNames = new Set(existingScopes.map((scope) => scope.name));
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const kongClient = await kcAdminClient.clients.find({
    realm: realmName,
    clientId: tokenExchangerClientId,
  });

  await Promise.all(
    scopes.map(async (scopeName) => {
      let scopeId = null;
      if (!existingScopeNames.has(scopeName)) {
        const scope = await kcAdminClient.clientScopes.create({
          realm: realmName,
          name: scopeName,
          protocol: 'openid-connect',
        });
        scopeId = scope.id!;
      } else {
        scopeId = existingScopes.find((scope) => scope.name === scopeName)?.id || null;
      }

      if (kongClient && kongClient.length > 0 && scopeId) {
        await kcAdminClient.clients.addOptionalClientScope({
          id: kongClient[0].id!,
          realm: realmName,
          clientScopeId: scopeId,
        });
      }
    }),
  );
};

export const processSdxWorkflowUpdates = async (
  requestId: number,
  data: SDXAllowedAccessUpdate,
): Promise<SDXAllowedAccessUpdateResult> => {
  const integrationData = await getIntegrationById(requestId, [
    'id',
    'environments',
    'clientId',
    'sdxEnabled',
    'status',
  ]);

  if (!integrationData) {
    throw new Error(`Integration with ID ${requestId} not found`);
  }

  if (!integrationData.sdxEnabled) {
    throw new Error(`SDX is not enabled for integration with ID ${requestId}`);
  }

  if (integrationData.status !== 'applied') {
    throw new Error(`Integration with ID ${requestId} is not in applied state`);
  }

  if (data.clientId && data.clientId !== integrationData.clientId) {
    throw new Error(`SDX callback client ID does not match integration with ID ${requestId}`);
  }

  // Runs as the `sdx-callback` system actor, set by the route.
  return await audit.runAuditedOperation(
    {
      action: 'sdx-access-request-update',
      requestId,
      details: {
        clientId: data.clientId,
        submissionId: data.submissionId,
        environment: data.environment,
        resourceServers: data.resourceServers,
      },
    },
    async () => {
      const resourceServers = data.resourceServers || [];
      const sdxEnvironments = new Set(data.environment ? [data.environment] : []);

      for (const rs of resourceServers) {
        if (data.environment && rs.environment !== data.environment) {
          throw new Error(
            `SDX callback environment '${data.environment}' does not match resource server environment '${rs.environment}'`,
          );
        }
        sdxEnvironments.add(rs.environment);
      }

      if (sdxEnvironments.size === 0) {
        throw new Error('SDX callback environment is required when resourceServers is empty');
      }

      const scopesByEnvironment = new Map<string, Set<string>>();
      for (const sdxEnvironment of Array.from(sdxEnvironments)) {
        const environments = keycloakEnvironmentsForSdxEnvironment(sdxEnvironment);
        for (const environment of environments) {
          if (!scopesByEnvironment.has(environment)) scopesByEnvironment.set(environment, new Set());
        }
      }

      for (const rs of resourceServers) {
        const environments = keycloakEnvironmentsForSdxEnvironment(rs.environment);
        for (const service of rs.services || []) {
          for (const environment of environments) {
            const scopes = scopesByEnvironment.get(environment)!;
            for (const scope of service.scopes || []) {
              scopes.add(getScopeLabel(scope));
            }
          }
        }
      }

      const reconciliations = await Promise.all(
        Array.from(scopesByEnvironment, ([environment, scopes]) =>
          manageKeycloakScopes(integrationData.clientId, environment, Array.from(scopes)),
        ),
      );

      return {
        integrationId: requestId,
        submissionId: data.submissionId,
        status: 'applied' as const,
        reconciliations,
      };
    },
    { successDetails: (result) => ({ status: result.status, reconciliations: result.reconciliations }) },
  );
};

export const manageKeycloakScopes = async (clientId: string, environment: string, scopes: string[]) => {
  const allSdxScopes = Array.from(
    new Set(
      (await listSdxResourceServers()).flatMap((rs) =>
        (rs.services || []).flatMap((service) => (service.scopes || []).map((scope) => getScopeLabel(scope))),
      ),
    ),
  );
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const result = await kcAdminClient.clients.find({ realm: 'standard', clientId });

  if (!result || result.length === 0) {
    throw new Error(`Client '${clientId}' not found in Keycloak environment '${environment}'`);
  }

  const client: ClientRepresentation = result[0];

  const [optionalScopeIds, defaultScopes] = await Promise.all([
    listOptionalClientScopeIds(kcAdminClient, client.id!),
    kcAdminClient.clients.listDefaultClientScopes({ realm: 'standard', id: client.id! }),
  ]);
  const defaultScopeNames = new Set(defaultScopes.map((scope) => scope.name));

  const allKeycloakScopes = await kcAdminClient.clientScopes.find({ realm: 'standard' });

  // Only optional scopes that SDX knows about are reconciled; any other client scope is not ours to remove.
  const scopesToRemove = allSdxScopes.filter((scope) => !scopes.includes(scope));
  const removedScopes = scopesToRemove.filter((scope) => optionalScopeIds.has(scope));
  await removeOptionalClientScopes(kcAdminClient, client.id!, optionalScopeIds, scopesToRemove);

  // A scope already on the client, as optional or default, is not added again.
  const scopesToAdd = scopes.filter((scope) => !optionalScopeIds.has(scope) && !defaultScopeNames.has(scope));

  await Promise.all(
    scopesToAdd.map((scope) =>
      kcAdminClient.clients.addOptionalClientScope({
        id: client.id!,
        realm: 'standard',
        clientScopeId: allKeycloakScopes.find((s) => s.name === scope)?.id!,
      }),
    ),
  );

  const kongClient = await kcAdminClient.clients.find({
    realm: 'standard',
    clientId: tokenExchangerClientId,
  });

  if (kongClient && kongClient.length > 0) {
    const clientScope = allKeycloakScopes.find((s) => s.name === client.clientId);
    if (clientScope) {
      const mapperExists = await kcAdminClient.clientScopes.findProtocolMapperByName({
        realm: 'standard',
        name: 'sdx_rg_pzgw_aud',
        id: clientScope.id!,
      });

      if (!mapperExists) {
        await kcAdminClient.clientScopes.addProtocolMapper(
          {
            realm: 'standard',
            id: clientScope.id!,
          },
          {
            name: 'sdx_rg_pzgw_aud',
            protocol: 'openid-connect',
            protocolMapper: 'oidc-audience-mapper',
            config: {
              'included.client.audience': tokenExchangerClientId,
              'id.token.claim': 'false',
              'lightweight.claim': 'false',
              'access.token.claim': 'true',
              'introspection.token.claim': 'true',
              'userinfo.token.claim': 'false',
            },
          },
        );
      }
    }
  }

  return { environment, addedScopes: scopesToAdd, removedScopes };
};

export const getSdxSubsystemStatus = async (requestId: number) => {
  try {
    const response = await fetch(`${process.env.SDX_API || ''}/integrations/${requestId}`, {
      headers: {
        Authorization: `Bearer ${await getToken()}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch SDX status: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error({ err: error }, 'Error fetching SDX status');
    throw new Error('Failed to fetch SDX status');
  }
};

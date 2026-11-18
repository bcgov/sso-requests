import type { SDXAccessRequest, SDXService, SDXServiceScope, Session } from '@app/shared/interfaces';
import { SDXResourceServer } from '@app/shared/interfaces';
import createHttpError from 'http-errors';
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

const collectScopesByEnvironment = (resourceServers: SDXResourceServer[] = []) => {
  const byEnvironment: { [environment: string]: Set<string> } = {};

  for (const rs of resourceServers) {
    for (const service of rs.services || []) {
      for (const scope of service.scopes || []) {
        if (!byEnvironment[rs.environment]) byEnvironment[rs.environment] = new Set();
        byEnvironment[rs.environment].add(`${rs.id}###${service.name}###${service.version}###${getScopeLabel(scope)}`);
      }
    }
  }

  return byEnvironment;
};

/**
 * Compares the existing access state against the new state and returns, per environment, the scopes
 * that are no longer requested. Covers removal of a scope, a version, a service, or a whole resource server.
 */
export const getRemovedScopes = (
  existingResourceServers: SDXResourceServer[] = [],
  newResourceServers: SDXResourceServer[] = [],
): { [environment: string]: string[] } => {
  const existingByEnvironment = collectScopesByEnvironment(existingResourceServers);
  const newByEnvironment = collectScopesByEnvironment(newResourceServers);

  const removedByEnv: { [environment: string]: string[] } = {};

  for (const [environment, scopes] of Object.entries(existingByEnvironment)) {
    const retained = newByEnvironment[environment] || new Set<string>();
    const removedScopes = Array.from(scopes).filter((scope) => !retained.has(scope));
    if (removedScopes.length > 0) {
      removedByEnv[environment] = removedScopes.map((scope) => scope.split('###')[3]); // Extract the scope part from the composite key
    }
  }

  return removedByEnv;
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

const removeSdxAccessByScopes = async (clientId: string, environment: string, scopes: string[]) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const result = await kcAdminClient.clients.find({ realm: 'standard', clientId });

  if (!result || result.length === 0) {
    log.info({ clientId, environment }, 'client not found in Keycloak, skipping scope removal');
    return;
  }

  const client = result[0];
  const optionalScopeIds = await listOptionalClientScopeIds(kcAdminClient, client.id!);

  await removeOptionalClientScopes(kcAdminClient, client.id!, optionalScopeIds, scopes);
};

const removeSdxAccessFromKeycloak = async (clientId: string, environment: string, scopes: string[]) => {
  const keycloakEnvironments = isProductionSdxEnvironment(environment) ? ['prod'] : ['dev', 'test'];
  await Promise.all(
    keycloakEnvironments.map((keycloakEnvironment) => removeSdxAccessByScopes(clientId, keycloakEnvironment, scopes)),
  );
};

const catalogKey = (...parts: string[]) => parts.join('###');

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

type RequestedService = { environment: string; id: string; name: string; version?: string; labels: string[] };

/**
 * Checks the shape of the requested access and flattens it to one entry per service that requests scopes. Throws a
 * 400 naming every malformed field, so nothing malformed is matched against the catalog or sent on. Resource servers
 * and services that request no scope are skipped. A missing or empty version means "any version".
 */
const parseRequestedServices = (requested: unknown): RequestedService[] => {
  if (!Array.isArray(requested)) throw new createHttpError.BadRequest('Invalid SDX access request: resourceServers');

  const invalid: string[] = [];
  const parsed: RequestedService[] = [];

  requested.forEach((resourceServer, resourceServerIndex) => {
    const resourceServerPath = `resourceServers[${resourceServerIndex}]`;
    const services = resourceServer?.services;
    if (services === undefined || services === null) return;
    if (!Array.isArray(services)) {
      invalid.push(`${resourceServerPath}.services`);
      return;
    }

    services.forEach((service, serviceIndex) => {
      const servicePath = `${resourceServerPath}.services[${serviceIndex}]`;
      const scopes = service?.scopes;
      if (scopes === undefined || scopes === null || (Array.isArray(scopes) && scopes.length === 0)) return;
      if (!Array.isArray(scopes)) {
        invalid.push(`${servicePath}.scopes`);
        return;
      }

      const fieldErrors: string[] = [];
      if (!isNonEmptyString(resourceServer.environment)) fieldErrors.push(`${resourceServerPath}.environment`);
      if (!isNonEmptyString(resourceServer.id)) fieldErrors.push(`${resourceServerPath}.id`);
      if (!isNonEmptyString(service.name)) fieldErrors.push(`${servicePath}.name`);
      const hasVersion = service.version !== undefined && service.version !== null && service.version !== '';
      if (hasVersion && !isNonEmptyString(service.version)) fieldErrors.push(`${servicePath}.version`);

      const labels = scopes.map((scope: unknown) =>
        typeof scope === 'string' ? scope : (scope as SDXServiceScope | null)?.label,
      );
      labels.forEach((label, scopeIndex) => {
        if (!isNonEmptyString(label)) fieldErrors.push(`${servicePath}.scopes[${scopeIndex}]`);
      });

      if (fieldErrors.length > 0) {
        invalid.push(...fieldErrors.filter((field) => !invalid.includes(field)));
        return;
      }

      parsed.push({
        environment: resourceServer.environment,
        id: resourceServer.id,
        name: service.name,
        version: hasVersion ? service.version : undefined,
        labels: labels as string[],
      });
    });
  });

  if (invalid.length > 0) {
    throw new createHttpError.BadRequest(`Invalid SDX access request: ${invalid.join(', ')}`);
  }

  return parsed;
};

/**
 * Checks the requested access against the SDX catalog and rebuilds it from the catalog entries, so only offered
 * scopes and known fields reach SDX and Keycloak. A service requested without a version (allowed access SDX returned
 * without one) matches every catalog version of it that offers the scope, the same fallback the form uses. Resource
 * servers and services that request no scope are dropped.
 */
export const validateSdxResourceServers = async (requested: SDXResourceServer[]): Promise<SDXResourceServer[]> => {
  const requestedServices = parseRequestedServices(requested);

  type CatalogService = { resourceServer: SDXResourceServer; service: SDXService };
  const catalogServices = new Map<string, CatalogService[]>();
  for (const resourceServer of await listSdxResourceServers()) {
    for (const service of resourceServer.services || []) {
      const key = catalogKey(resourceServer.environment, resourceServer.id, service.name);
      catalogServices.set(key, [...(catalogServices.get(key) || []), { resourceServer, service }]);
    }
  }

  const unknownScopes: string[] = [];
  const validated = new Map<string, SDXResourceServer>();

  const addScope = ({ resourceServer, service }: CatalogService, label: string) => {
    const resourceServerKey = catalogKey(resourceServer.environment, resourceServer.id);
    const entry = validated.get(resourceServerKey) ?? {
      id: resourceServer.id,
      name: resourceServer.name,
      organization: resourceServer.organization,
      description: resourceServer.description,
      environment: resourceServer.environment,
      services: [],
    };
    const existingService = entry.services.find(
      (candidate) => candidate.name === service.name && candidate.version === service.version,
    );
    if (!existingService) entry.services.push({ name: service.name, version: service.version, scopes: [label] });
    else if (!(existingService.scopes as string[]).includes(label)) (existingService.scopes as string[]).push(label);
    validated.set(resourceServerKey, entry);
  };

  for (const { environment, id, name, version, labels } of requestedServices) {
    const candidates = (catalogServices.get(catalogKey(environment, id, name)) || []).filter(
      (candidate) => !version || candidate.service.version === version,
    );

    for (const label of labels) {
      const offering = candidates.filter((candidate) =>
        (candidate.service.scopes || []).some((scope) => getScopeLabel(scope) === label),
      );
      if (offering.length === 0) unknownScopes.push(`${id}/${name}/${version || '(any version)'}/${label}`);
      offering.forEach((candidate) => addScope(candidate, label));
    }
  }

  if (unknownScopes.length > 0) {
    throw new createHttpError.BadRequest(`SDX scopes not offered by SDX: ${unknownScopes.join(', ')}`);
  }

  return Array.from(validated.values());
};

export const createSdxRequest = async (session: Session, request: Integration) => {
  // Rejected before anything is sent to SDX or recorded, so a bad request leaves no audit row.
  if (!request.sdxServices) throw new createHttpError.BadRequest('SDX services cannot be empty');
  if ((request.sdxServices.resourceServers || []).length === 0) {
    throw new createHttpError.BadRequest('SDX resource servers cannot be empty');
  }
  const resourceServers = await validateSdxResourceServers(request.sdxServices.resourceServers);
  if (resourceServers.length === 0) throw new createHttpError.BadRequest('SDX resource servers cannot be empty');

  try {
    const user = await getUserById(session.user?.id || 0, { raw: true });

    const privacyZoneUri = await getPrivacyZoneURI('prod', request.bcscPrivacyZone || '');
    const sdxRequestData = {
      integrationId: request.id!,
      resourceServers,
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
      { action: 'sdx-request-create', requestId: request.id, details: { services: { resourceServers } } },
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
          log.error(`Failed to create SDX request: ${errorText}`);
          throw new Error('Failed to create SDX request');
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

    // If the request is already applied, we need to check for removed scopes and remove them from Keycloak
    if (request.status === 'applied') {
      const subSystem = await getSdxSubsystemStatus(request.id!);

      if (subSystem?.status === 'registered') {
        const existingSdxAccess = await getSdxServicesForClient(session, request.id!, 'approved');
        const removedScopesByEnv = getRemovedScopes(existingSdxAccess.resourceServers, resourceServers);
        await Promise.all(
          Object.entries(removedScopesByEnv).map(([sdxEnvironment, scopes]) =>
            removeSdxAccessFromKeycloak(existingSdxAccess.clientId, sdxEnvironment, scopes),
          ),
        );
      }
    }
  } catch (error) {
    log.error({ err: error }, 'error creating SDX request');
    throw new Error('Failed to process request for SDX services');
  }

  return {
    success: true,
    message: 'SDX request created successfully',
    data: {
      requestId: request.id!,
      resourceServers,
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

export const processSdxWorkflowUpdates = async (requestId: number, data: SDXAccessRequest) => {
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

  // Runs as the `sdx-callback` system actor, set by the route.
  await audit.runAuditedOperation(
    {
      action: 'sdx-access-request-update',
      requestId,
      details: { resourceServers: data.resourceServers },
    },
    async () => {
      if (data.resourceServers && data.resourceServers.length > 0) {
        const scopesByEnvironment = new Map<string, Set<string>>();
        for (const rs of data.resourceServers) {
          for (const service of rs.services || []) {
            if (service.scopes && service.scopes.length > 0) {
              const environments = isProductionSdxEnvironment(rs.environment) ? ['prod'] : ['dev', 'test'];
              for (const environment of environments) {
                const scopes = scopesByEnvironment.get(environment) || new Set<string>();
                for (const scope of service.scopes.map(getScopeLabel)) {
                  scopes.add(scope);
                }
                scopesByEnvironment.set(environment, scopes);
              }
            }
          }
        }
        await Promise.all(
          Array.from(scopesByEnvironment, ([environment, scopes]) =>
            manageKeycloakScopes(integrationData.clientId, environment, Array.from(scopes)),
          ),
        );
      }
    },
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
    log.info({ clientId, environment }, 'client not found in Keycloak, skipping scope management');
    return;
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
      log.error(`Failed to fetch SDX status: ${errorText}`);
      throw new Error('Failed to fetch SDX status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error({ err: error }, 'Error fetching SDX status');
    throw new Error('Failed to fetch SDX status');
  }
};

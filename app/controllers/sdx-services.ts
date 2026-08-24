import type { SDXAccessRequest, Session } from '@app/shared/interfaces';
import { SDXResourceServer } from '@app/shared/interfaces';
import { getAllowedRequest, getIntegrationById } from '@app/queries/request';
import { EVENTS } from '@app/shared/enums';
import { createEvent } from './requests';
import { getAdminClient } from '@app/keycloak/adminClient';
import { getClientScopes } from '@app/keycloak/clientScopes';
import ClientScopeRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientScopeRepresentation';
import { createSdxAccessRequest } from '@app/queries/sdx-services';
import { Integration } from '@app/interfaces/Request';
import { getUserById } from '@app/queries/user';
import { getPrivacyZoneURI } from '@app/utils/bcsc-client';
import { SDX_ENVIRONMENTS } from '@app/utils/constants';

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
      console.error('Error fetching SDX token:', error);
      throw new Error('Failed to fetch SDX token');
    });
};

export const getSdxServicesForClient = async (
  session: Session,
  requestId: number,
  status: string,
): Promise<{ clientId: string; resourceServers: SDXResourceServer[] }> => {
  const current = await getAllowedRequest(session, requestId);
  if (!current) throw new Error('Request not found');

  const envs = getSdxEnvironments();

  const data = {
    clientId: current.clientId,
    resourceServers: [] as SDXResourceServer[],
  };

  try {
    for (const env of Object.values(envs)) {
      const response = await fetch(
        `${process.env.SDX_API || ''}/integrations/${current?.id}/allowed-services?environment=${env}&status=${status}`,
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );
      const resourceServers = (await response.json()).resourceServers as SDXResourceServer[];
      data.resourceServers.push(...resourceServers);
    }
    return data;
  } catch (err) {
    console.error('Error fetching SDX services:', err);
    throw new Error('Failed to fetch SDX services');
  }
};

export const listSdxResourceServers = async (): Promise<SDXResourceServer[]> => {
  try {
    let resourceServers: SDXResourceServer[] = [];

    for (const env of Object.values(getSdxEnvironments())) {
      const response = await fetch(`${process.env.SDX_API || ''}/resource-servers?environment=${env}`, {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });
      resourceServers.push(...(await response.json()));
    }
    return resourceServers;
  } catch (err) {
    console.error('Error fetching SDX resource servers:', err);
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

const removeSdxAccessByScopes = async (clientId: string, environment: string, scopes: string[]) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const result = await kcAdminClient.clients.find({ realm: 'standard', clientId });

  if (!result || result.length === 0) {
    console.info(
      `Client with ID ${clientId} not found in Keycloak for environment ${environment} - skipping scope removal`,
    );
    return;
  }

  const client = result[0];

  const existingScopes = await kcAdminClient.clients.listDefaultClientScopes({ id: client.id!, realm: 'standard' });
  const existingScopeNames = new Set(existingScopes.map((scope) => scope.name));

  const scopesToRemove = scopes.filter((scope) => existingScopeNames.has(scope));

  for (const scope of scopesToRemove) {
    await kcAdminClient.clients.delDefaultClientScope({
      id: client.id!,
      realm: 'standard',
      clientScopeId: existingScopes.find((s) => s.name === scope)?.id!,
    });
  }
};

const removeSdxAccessFromKeycloak = async (clientId: string, environment: string, scopes: string[]) => {
  const keycloakEnvironments = isProductionSdxEnvironment(environment) ? ['prod'] : ['dev', 'test'];
  await Promise.all(
    keycloakEnvironments.map((keycloakEnvironment) => removeSdxAccessByScopes(clientId, keycloakEnvironment, scopes)),
  );
};

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

    const responseData = await response.json();

    await createSdxAccessRequest(responseData.submissionId || '', user?.displayName || '', request.id!, sdxRequestData);

    await initializeScopes(resourceServers);

    // If the request is already applied, we need to check for removed scopes and remove them from Keycloak
    if (request.status === 'applied') {
      const subSystem = await getSdxSubsystemStatus(request.id!);

      if (subSystem?.status === 'registered') {
        const existingSdxAccess = await getSdxServicesForClient(session, request.id!, 'approved');
        const removedScopesByEnv = getRemovedScopes(existingSdxAccess.resourceServers, resourceServers);
        for (const [sdxEnvironment, scopes] of Object.entries(removedScopesByEnv)) {
          await removeSdxAccessFromKeycloak(existingSdxAccess.clientId, sdxEnvironment, scopes);
        }
      }
    }
  } catch (error) {
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

  for (const [environment, scopes] of Object.entries(sdxScopes)) {
    if (isProductionSdxEnvironment(environment)) {
      await keycloakSyncScopes('prod', 'standard', Array.from(scopes));
    } else {
      await Promise.all(['dev', 'test'].map((env) => keycloakSyncScopes(env, 'standard', Array.from(scopes))));
    }
  }
};

const keycloakSyncScopes = async (environment: string, realmName: string, scopes: string[]) => {
  const existingScopes = await getClientScopes({ environment, realmName });
  const existingScopeNames = new Set(existingScopes.map((scope) => scope.name));
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const kongClient = await kcAdminClient.clients.find({ realm: realmName, clientId: 'sdx-rg-pzgw' });

  for (const scopeName of scopes) {
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
  }
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

  await createEvent({
    eventCode: EVENTS.SDX_ACCESS_REQUEST_UPDATE,
    requestId,
    details: data,
  });

  if (data.resourceServers && data.resourceServers.length > 0) {
    for (const rs of data.resourceServers) {
      for (const service of rs.services || []) {
        if (service.scopes && service.scopes.length > 0) {
          const scopes = service.scopes.map(getScopeLabel);
          if (isProductionSdxEnvironment(rs.environment)) {
            await manageKeycloakScopes(integrationData.clientId, 'prod', scopes);
          } else {
            await Promise.all(
              ['dev', 'test'].map(async (env) => await manageKeycloakScopes(integrationData.clientId, env, scopes)),
            );
          }
        }
      }
    }
  }
};

export const manageKeycloakScopes = async (clientId: string, environment: string, scopes: string[]) => {
  const allScopes = Array.from(
    new Set(
      (await listSdxResourceServers()).flatMap((rs) =>
        (rs.services || []).flatMap((service) => (service.scopes || []).map((scope) => getScopeLabel(scope))),
      ),
    ),
  );
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const result = await kcAdminClient.clients.find({ realm: 'standard', clientId });

  if (!result || result.length === 0) {
    console.info(
      `Client with ID ${clientId} not found in Keycloak for environment ${environment} - skipping scope management`,
    );
    return;
  }

  const client = result[0];

  const allAssignedScopes = await kcAdminClient.clients.listDefaultClientScopes({
    realm: 'standard',
    id: client.id!,
  });
  const allAssignedScopesNames = new Set(allAssignedScopes.map((scope: ClientScopeRepresentation) => scope.name));

  const allKeycloakScopes = await kcAdminClient.clientScopes.find({ realm: 'standard' });

  const sdxAssignedScopes = allScopes.filter((scope) => allAssignedScopesNames.has(scope));

  const scopesToRemove = sdxAssignedScopes.filter((scope) => !scopes.includes(scope));

  if (scopesToRemove.length > 0) {
    for (const scope of scopesToRemove) {
      await kcAdminClient.clients.delDefaultClientScope({
        id: client.id!,
        realm: 'standard',
        clientScopeId: allKeycloakScopes.find((s) => s.name === scope)?.id!,
      });
    }
  }

  const scopesToAdd = scopes.filter((scope) => !allAssignedScopesNames.has(scope));

  for (const scope of scopesToAdd) {
    await kcAdminClient.clients.addDefaultClientScope({
      id: client.id!,
      realm: 'standard',
      clientScopeId: allKeycloakScopes.find((s) => s.name === scope)?.id!,
    });
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
      throw new Error(`Failed to fetch SDX status: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching SDX status:', error);
    throw new Error('Failed to fetch SDX status');
  }
};

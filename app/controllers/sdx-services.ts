import type { SDXAccessRequest, Session } from '@app/shared/interfaces';
import { sequelize } from '@app/shared/sequelize/models/models';
import { SDXResourceServer } from '@app/shared/interfaces';
import { getAllowedRequest, getIntegrationById } from '@app/queries/request';
import { EVENTS } from '@app/shared/enums';
import { createEvent } from './requests';
import { getAdminClient } from '@app/keycloak/adminClient';
import { createClientScope, getClientScopes } from '@app/keycloak/clientScopes';
import ClientScopeRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientScopeRepresentation';
import { createSdxAccessRequest } from '@app/queries/sdx-services';

const getSdxEnvironments = () => {
  return process.env.NEXT_PUBLIC_APP_ENV === 'production'
    ? { production: 'bc', 'non-production': 'bct' }
    : { production: 'apstest', 'non-production': 'apsdev' };
};

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
        `${process.env.SDX_API || ''}/${current?.clientId}/allowed-services?environment=${env}&status=${status}`,
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

export const listSdxResourceServers = async (session: Session): Promise<SDXResourceServer[]> => {
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
        byEnvironment[rs.environment].add(`${service.name}$$${service.version}$$${scope}`);
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
      removedByEnv[environment] = removedScopes.map((scope) => scope.split('$$')[2]); // Extract the scope part from the composite key
    }
  }

  return removedByEnv;
};

const removeSdxAccessByScopes = async (clientId: string, environment: string, scopes: string[]) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const result = await kcAdminClient.clients.find({ realm: 'standard', clientId });

  if (!result || result.length === 0) {
    throw new Error(`Client with ID ${clientId} not found`);
  }

  const client = result[0];

  const existingScopes = await kcAdminClient.clients.listDefaultClientScopes({ id: client.id!, realm: 'standard' });
  const existingScopeNames = new Set(existingScopes.map((scope: ClientScopeRepresentation) => scope.name));

  const scopesToRemove = scopes.filter((scope) => existingScopeNames.has(scope));

  for (const scope of scopesToRemove) {
    await kcAdminClient.clients.delDefaultClientScope({ id: client.id!, realm: 'standard', clientScopeId: scope });
  }
};

export const createSdxRequest = async (session: Session, requestId: number, sdxRequestData: SDXAccessRequest) => {
  const transaction = await sequelize.transaction();

  try {
    const resourceServers = sdxRequestData.resourceServers || [];
    await initializeScopes(resourceServers);
    const existingSdxAccess = await getSdxServicesForClient(session, requestId, 'approved');
    const removedScopesByEnv = getRemovedScopes(existingSdxAccess.resourceServers, resourceServers);
    for (const [environment, scopes] of Object.entries(removedScopesByEnv)) {
      await removeSdxAccessByScopes(existingSdxAccess.clientId, environment, scopes);
    }

    const response = await fetch(`${process.env.SDX_API || ''}/access-requests`, {
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

    await createSdxAccessRequest(
      responseData.submissionId || '',
      session?.user?.displayName || '',
      requestId,
      sdxRequestData,
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return {
    success: true,
    message: 'SDX request created successfully',
    data: {
      requestId,
      ...sdxRequestData,
    },
  };
};

const initializeScopes = async (resourceServers: SDXResourceServer[]) => {
  const sdxScopes: { [environment: string]: Set<string> } = {};

  for (const rs of resourceServers) {
    for (const service of rs.services) {
      if (service.scopes && service.scopes.length > 0) {
        for (const scope of service.scopes) {
          if (!sdxScopes[rs.environment]) {
            sdxScopes[rs.environment] = new Set();
          }
          sdxScopes[rs.environment].add(scope as string);
        }
      }
    }
  }

  for (const [environment, scopes] of Object.entries(sdxScopes)) {
    environment === 'production'
      ? await keycloakSyncScopes('prod', 'standard', Array.from(scopes))
      : ['dev', 'test'].forEach((env) => keycloakSyncScopes(env, 'standard', Array.from(scopes)));
  }
};

const keycloakSyncScopes = async (environment: string, realmName: string, scopes: string[]) => {
  const existingScopes = await getClientScopes({ environment, realmName });
  const existingScopeNames = new Set(existingScopes.map((scope) => scope.name));

  for (const scope of scopes) {
    if (!existingScopeNames.has(scope)) {
      await createClientScope({
        protocol: 'openid-connect',
        environment,
        realmName,
        scopeName: scope,
      });
    }
  }
};

export const processSdxRequestApprovals = async (requestId: number, data: SDXAccessRequest) => {
  const eventData = {
    eventCode: EVENTS.SDX_ACCESS_REQUEST_UPDATE,
    requestId,
    details: data,
  };

  await createEvent(eventData);

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

  if (data.resourceServers && data.resourceServers.length > 0) {
    for (const rs of data.resourceServers) {
      for (const service of rs.services) {
        if (service.scopes && service.scopes.length > 0) {
          rs.environment === 'production'
            ? await manageKeycloakScopes(integrationData.clientId, 'prod', Array.from(service.scopes as string[]))
            : ['dev', 'test'].forEach((env) =>
                manageKeycloakScopes(integrationData.clientId, env, Array.from(service.scopes as string[])),
              );
        }
      }
    }
  }
};

export const manageKeycloakScopes = async (clientId: string, environment: string, scopes: string[]) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const result = await kcAdminClient.clients.find({ realm: 'standard', clientId });

  if (!result || result.length === 0) {
    throw new Error(`Client with ID ${clientId} not found`);
  }

  const client = result[0];

  const existingScopes = await kcAdminClient.clients.listDefaultClientScopes({ id: client.id!, realm: 'standard' });
  const existingScopeNames = new Set(existingScopes.map((scope: ClientScopeRepresentation) => scope.name));

  const scopesToAdd = scopes.filter((scope) => !existingScopeNames.has(scope));

  for (const scope of scopesToAdd) {
    await kcAdminClient.clients.addDefaultClientScope({ id: client.id!, realm: 'standard', clientScopeId: scope });
  }
};

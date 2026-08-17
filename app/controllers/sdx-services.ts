import type { SDXAccessRequest, Session } from '@app/shared/interfaces';
import { sequelize } from '@app/shared/sequelize/models/models';
import { SDXResourceServer, SDXServiceScope } from '@app/shared/interfaces';
import { getAllowedRequest, getIntegrationById } from '@app/queries/request';
import { EVENTS } from '@app/shared/enums';
import { createEvent } from './requests';
import { getAdminClient } from '@app/keycloak/adminClient';
import { createClientScope, getClientScopes } from '@app/keycloak/clientScopes';
import ClientScopeRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientScopeRepresentation';
import { createSdxAccessRequest } from '@app/queries/sdx-services';

export const getSdxServicesForClient = async (
  session: Session,
  requestId: number,
  status: string,
): Promise<{ clientId: string; resourceServers: SDXResourceServer[] }> => {
  const current = await getAllowedRequest(session, requestId);
  if (!current) throw new Error('Request not found');

  if (status === 'approved') {
    return {
      clientId: current.clientId,
      resourceServers: [
        {
          id: 'claims',
          environment: 'non-production',
          services: [
            {
              name: 'phn-lookup',
              scopes: ['hlth:HealthNumber.read'],
              version: 'v2',
            },
            {
              name: 'data-usage-api',
              version: 'v1',
              scopes: ['hlth:DataAccessRequestsCount.read'],
            },
          ],
        },
      ],
    };
  } else if (status === 'pending') {
    return {
      clientId: current.clientId,
      resourceServers: [
        {
          id: 'claims',
          environment: 'non-production',
          services: [
            {
              name: 'phn-lookup',
              version: 'v2',
              scopes: ['hlth:HealthNumber.write'],
            },
            {
              name: 'data-usage-api',
              version: 'v1',
              scopes: ['hlth:DataAccessRequestsCount.write'],
            },
          ],
        },
      ],
    };
  } else {
    throw new Error('Invalid status');
  }
};

export const listSdxResourceServers = (session: Session): SDXResourceServer[] => {
  return [
    {
      id: 'claims',
      name: 'Claims',
      organization: 'Ministry of Health',
      description: 'This resource server provides access to health-related claims.',
      environment: 'non-production',
      services: [
        {
          name: 'phn-lookup',
          title: 'PHN Lookup API',
          summary: 'API for looking up Personal Health Numbers (PHNs).',
          version: 'v2',
          scopes: [
            {
              label: 'hlth:HealthNumber.read',
              description: 'Read health number',
            },
            {
              label: 'hlth:HealthNumber.write',
              description: 'Write health number',
            },
            {
              label: 'hlth:PatientDemographics.read',
              description: 'Read patient demographics',
            },
            {
              label: 'hlth:PatientRelationships.read',
              description: 'Read patient relationships',
            },
          ],
        },
      ],
    },
    {
      id: 'data-usage',
      name: 'Data Usage',
      organization: 'Ministry of Health',
      description: 'This resource server provides access to data usage metrics.',
      environment: 'non-production',
      services: [
        {
          name: 'data-usage-api',
          title: 'Data Usage API',
          summary: 'API for accessing data usage metrics.',
          version: 'v1',
          scopes: [
            {
              label: 'hlth:DataAccessRequestsCount.read',
              description: 'List data access requests and read their count.',
            },
            {
              label: 'hlth:DataAccessRequestsCount.write',
              description: 'Create data access requests and update their count.',
            },
            {
              label: 'hlth:DataAccessRequests.read',
              description: 'Read data access requests.',
            },
          ],
        },
      ],
    },
    {
      id: 'student-records',
      name: 'Student Records',
      organization: 'Ministry of Education',
      description: 'This resource server provides access to student records.',
      environment: 'non-production',
      services: [
        {
          name: 'student-records-api',
          title: 'Student Records API',
          summary: 'API for accessing student records.',
          version: 'v1',
          scopes: [
            {
              label: 'edu:StudentRecords.read',
              description: 'Read student records.',
            },
            {
              label: 'edu:StudentRecords.write',
              description: 'Write student records.',
            },
            {
              label: 'edu:StudentRecords.delete',
              description: 'Delete student records.',
            },
          ],
        },
      ],
    },
    {
      id: 'claims',
      name: 'Claims',
      organization: 'Ministry of Health',
      description: 'This resource server provides access to health-related claims.',
      environment: 'production',
      services: [
        {
          name: 'phn-lookup',
          title: 'PHN Lookup API',
          summary: 'API for looking up Personal Health Numbers (PHNs).',
          version: 'v2',
          scopes: [
            {
              label: 'hlth:HealthNumber.read',
              description: 'Read health number',
            },
            {
              label: 'hlth:HealthNumber.write',
              description: 'Write health number',
            },
          ],
        },
      ],
    },
    {
      id: 'data-usage',
      name: 'Data Usage',
      organization: 'Ministry of Health',
      description: 'This resource server provides access to data usage metrics.',
      environment: 'production',
      services: [
        {
          name: 'data-usage-api',
          title: 'Data Usage API',
          summary: 'API for accessing data usage metrics.',
          version: 'v1',
          scopes: [
            {
              label: 'hlth:DataAccessRequestsCount.read',
              description: 'List data access requests and read their count.',
            },
            {
              label: 'hlth:DataAccessRequestsCount.write',
              description: 'Create data access requests and update their count.',
            },
          ],
        },
      ],
    },
    {
      id: 'student-records',
      name: 'Student Records',
      organization: 'Ministry of Education',
      description: 'This resource server provides access to student records.',
      environment: 'production',
      services: [
        {
          name: 'student-records-api',
          title: 'Student Records API',
          summary: 'API for accessing student records.',
          version: 'v1',
          scopes: [
            {
              label: 'edu:StudentRecords.read',
              description: 'Read student records.',
            },
            {
              label: 'edu:StudentRecords.write',
              description: 'Write student records.',
            },
          ],
        },
      ],
    },
  ];
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

    await createSdxAccessRequest(transaction, session?.user?.displayName || '', requestId, sdxRequestData);

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

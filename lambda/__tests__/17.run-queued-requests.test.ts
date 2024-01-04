import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import * as IntegrationModule from '@lambda-app/keycloak/integration';
import { formDataProd } from './helpers/fixtures';
import axios from 'axios';
import { getRequest, createRequestQueueItem, generateRequest, getQueueItems } from './helpers/modules/integrations';
import { ACTION_TYPES } from '@lambda-shared/enums';
import { QUEUE_ACTION } from '@lambda-shared/interfaces';
import { handler } from '../request-queue/src/main';

jest.mock('@lambda-app/keycloak/adminClient');

describe('Request Queue', () => {
  afterEach(async () => {
    await cleanUpDatabaseTables();
  });

  it('Creates new integrations in the queue and removes queue item if successful', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    await createRequestQueueItem(1, formDataProd, ACTION_TYPES.CREATE as QUEUE_ACTION);
    const request = await generateRequest(formDataProd);
    expect(request.status).toBe('draft');

    await handler();
    // Called for each environment
    expect(kcClientSpy).toHaveBeenCalledTimes(3);

    // Check the queue is cleared
    const queueItems = await getQueueItems();
    expect(queueItems.length).toBe(0);

    // Check the status updated
    const updatedRequest = await getRequest(request.id);
    expect(updatedRequest.status).toBe('applied');
    kcClientSpy.mockRestore();
  });

  it('Keeps item in the queue if any environments fail and updates request status to failed', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');

    await createRequestQueueItem(1, formDataProd, ACTION_TYPES.CREATE as QUEUE_ACTION);
    const request = await generateRequest(formDataProd);

    // Have one environment fail
    kcClientSpy.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await handler();

    const queueItems = await getQueueItems();
    expect(queueItems.length).toBe(1);

    const updatedRequest = await getRequest(request.id);
    expect(updatedRequest.status).toBe('applyFailed');
    kcClientSpy.mockRestore();
  });
});

describe('Delete and Update', () => {
  const setupKCMock = ({ clients = {}, roles = {}, clientScopes = {} }) => {
    const kcAdminClient = {
      clients: {
        find: jest.fn(() => Promise.resolve([])),
        del: jest.fn(),
        create: jest.fn((client) => ({ ...client, id: 1 })),
        update: jest.fn(),
        listProtocolMappers: jest.fn(() => Promise.resolve([])),
        listRoles: jest.fn(() => Promise.resolve([])),
        listDefaultClientScopes: jest.fn(() => Promise.resolve([])),
        addDefaultClientScope: jest.fn(),
        listOptionalClientScopes: jest.fn(() => Promise.resolve([])),
        addOptionalClientScope: jest.fn(),
        addProtocolMapper: jest.fn(),
        ...clients,
      },
      roles: {
        findOneByName: jest.fn(),
        delByName: jest.fn(),
        create: jest.fn(),
        ...roles,
      },
      clientScopes: {
        find: jest.fn(() => Promise.resolve([])),
        ...clientScopes,
      },
    };
    const mockedAdminClient = require('@lambda-app/keycloak/adminClient');
    mockedAdminClient.getAdminClient.mockImplementation(() => ({
      kcAdminClient,
    }));
    return kcAdminClient;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockImplementation(() => Promise.resolve({ data: [] }));
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  afterEach(async () => {
    await cleanUpDatabaseTables();
  });

  it('Deletes client if archived is true', async () => {
    const archivedData = { ...formDataProd, archived: true };
    const kcAdminClient = setupKCMock({
      clients: {
        find: jest.fn(() => Promise.resolve([archivedData])),
      },
    });
    await createRequestQueueItem(1, archivedData, ACTION_TYPES.DELETE as QUEUE_ACTION);
    await generateRequest(archivedData);

    await handler();
    expect(kcAdminClient.clients.del).toHaveBeenCalled();
  });

  it('Updates client if not archived but already exists', async () => {
    const kcAdminClient = setupKCMock({
      clients: {
        find: jest.fn(() => Promise.resolve([formDataProd])),
      },
    });
    await createRequestQueueItem(1, formDataProd, ACTION_TYPES.CREATE as QUEUE_ACTION);
    await generateRequest(formDataProd);

    await handler();
    expect(kcAdminClient.clients.del).not.toHaveBeenCalled();
    expect(kcAdminClient.clients.update).toHaveBeenCalled();
  });
});

import { cleanUpDatabaseTables, createMockSendEmail } from './helpers/utils';
import * as IntegrationModule from '@lambda-app/keycloak/integration';
import { formDataProd } from './helpers/fixtures';
import axios from 'axios';
import {
  getRequest,
  createRequestQueueItem,
  generateRequest,
  getQueueItems,
  getEventsByRequestId,
} from './helpers/modules/integrations';
import { ACTION_TYPES, EMAILS, EVENTS } from '@lambda-shared/enums';
import { QUEUE_ACTION } from '@lambda-shared/interfaces';
import { handler, MAX_ATTEMPTS } from '../request-queue/src/main';
import { createEvent, standardClients } from '@lambda-app/controllers/requests';

jest.mock('@lambda-app/keycloak/adminClient');

describe('Request Queue', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Includes existing client id in the queue item body if passed to the standard client', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    // Forcing failure so it doesn't remove queue item
    kcClientSpy.mockImplementation(() => Promise.resolve(false));

    await generateRequest(formDataProd);
    await standardClients(formDataProd, true, 'existing-id');
    const queueItems = await getQueueItems();
    expect(queueItems.length).toBe(1);
    expect(queueItems[0].request.existingClientId).toBe('existing-id');
  });

  it('Creates the integrations from the queue, removes queue item, creates event and sends email if successful', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));
    const emailResults = createMockSendEmail();

    await createRequestQueueItem(1, formDataProd, ACTION_TYPES.CREATE as QUEUE_ACTION, 61);
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

    // Check expected email sent
    expect(emailResults.length).toBe(1);
    const email = emailResults[0];
    expect(email.code).toBe(EMAILS.CREATE_INTEGRATION_APPLIED);
    expect(email.to.includes(formDataProd.user.idirEmail)).toBeTruthy();

    const events = await getEventsByRequestId(request.id);
    expect(events.length).toBe(1);
    expect(events[0].eventCode).toBe(EVENTS.REQUEST_APPLY_SUCCESS);
    kcClientSpy.mockRestore();
  });

  it('Ignores queue items if created too recently', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));
    // Simulate one second old
    await createRequestQueueItem(1, formDataProd, ACTION_TYPES.CREATE as QUEUE_ACTION, 1);

    await handler();
    expect(kcClientSpy).not.toHaveBeenCalled();

    // Check the queue item is still there
    const queueItems = await getQueueItems();
    expect(queueItems.length).toBe(1);
  });

  it('Sends an update email if request was previously applied', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));
    const emailResults = createMockSendEmail();

    await createRequestQueueItem(1, formDataProd, ACTION_TYPES.UPDATE as QUEUE_ACTION, 61);
    const request = await generateRequest(formDataProd);
    // Insert a previous applied event
    await createEvent({ eventCode: EVENTS.REQUEST_APPLY_SUCCESS, requestId: request.id });

    await handler();

    // Check expected email sent
    expect(emailResults.length).toBe(1);
    const email = emailResults[0];
    expect(email.code).toBe(EMAILS.UPDATE_INTEGRATION_APPLIED);
    expect(email.to.includes(formDataProd.user.idirEmail)).toBeTruthy();
  });

  it('Keeps item in the queue if any environments fail, updates request status to failed and increments attempt counter', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');

    await createRequestQueueItem(1, formDataProd, ACTION_TYPES.CREATE as QUEUE_ACTION, 61);
    const request = await generateRequest(formDataProd);

    let queueItems = await getQueueItems();
    expect(queueItems.length).toBe(1);
    expect(queueItems[0].attempts).toBe(0);

    // Have one environment fail
    kcClientSpy.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await handler();

    queueItems = await getQueueItems();
    expect(queueItems.length).toBe(1);
    expect(queueItems[0].attempts).toBe(1);

    const updatedRequest = await getRequest(request.id);
    expect(updatedRequest.status).toBe('applyFailed');
    kcClientSpy.mockRestore();
  });

  it('Ignores queue item if at max attempts', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    (axios.post as jest.Mock).mockImplementation(() => Promise.resolve({ data: [] }));
    await createRequestQueueItem(1, formDataProd, ACTION_TYPES.CREATE as QUEUE_ACTION, 61, MAX_ATTEMPTS);

    await handler();

    const queueItems = await getQueueItems();
    expect(queueItems.length).toBe(1);
    expect(queueItems[0].attempts).toBe(MAX_ATTEMPTS);
    expect(kcClientSpy).not.toHaveBeenCalled();
    // No rocket chat calls
    expect(axios.post).not.toHaveBeenCalled();
    kcClientSpy.mockRestore();
  });

  it('Sends a notification to rocket chat if max attempts is reached', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    // Reject all
    kcClientSpy.mockImplementation(() => Promise.resolve(false));
    (axios.post as jest.Mock).mockImplementation(() => Promise.resolve({ data: [] }));

    await createRequestQueueItem(1, formDataProd, ACTION_TYPES.CREATE as QUEUE_ACTION, 61, MAX_ATTEMPTS - 1);
    await handler();

    const queueItems = await getQueueItems();
    expect(queueItems.length).toBe(1);
    expect(queueItems[0].attempts).toBe(MAX_ATTEMPTS);
    expect(kcClientSpy).toHaveBeenCalledTimes(3);

    expect(axios.post).toHaveBeenCalledTimes(1);
    // Check rocket chat message
    const [_axiosUrl, axiosBody] = (axios.post as jest.Mock).mock.calls[0];
    expect(axiosBody.message).toBe(
      `SANDBOX: Request ${formDataProd.clientId} has reached maximum retries and requires manual intervention.`,
    );
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

  afterEach(async () => {
    await cleanUpDatabaseTables();
  });

  it('Deletes client if archived is true and does not send any email', async () => {
    const archivedData = { ...formDataProd, archived: true };
    const kcAdminClient = setupKCMock({
      clients: {
        find: jest.fn(() => Promise.resolve([archivedData])),
      },
    });
    await createRequestQueueItem(1, archivedData, ACTION_TYPES.DELETE as QUEUE_ACTION, 61);
    await generateRequest(archivedData);
    const emailResults = createMockSendEmail();

    await handler();
    expect(kcAdminClient.clients.del).toHaveBeenCalled();
    expect(emailResults.length).toBe(0);
  });

  it('Updates client if not archived but already exists', async () => {
    const kcAdminClient = setupKCMock({
      clients: {
        find: jest.fn(() => Promise.resolve([formDataProd])),
      },
    });
    await createRequestQueueItem(1, formDataProd, ACTION_TYPES.CREATE as QUEUE_ACTION, 61);
    await generateRequest(formDataProd);

    await handler();
    expect(kcAdminClient.clients.del).not.toHaveBeenCalled();
    expect(kcAdminClient.clients.update).toHaveBeenCalled();
  });

  it('Uses the existing client id if saved in the queue data', async () => {
    const existingClientId = 'existing-id-test';
    const kcAdminClient = setupKCMock({
      clients: {
        find: jest.fn(() => Promise.resolve([formDataProd])),
      },
    });
    const request = await generateRequest(formDataProd);
    await createRequestQueueItem(
      request.id,
      { ...formDataProd, existingClientId: existingClientId },
      ACTION_TYPES.CREATE as QUEUE_ACTION,
      61,
    );

    await handler();

    expect(kcAdminClient.clients.find).toHaveBeenCalledWith({ clientId: existingClientId, max: 1, realm: 'standard' });
  });

  it("Uses the integration's client id if existing client id is an empty string", async () => {
    const kcAdminClient = setupKCMock({
      clients: {
        find: jest.fn(() => Promise.resolve([formDataProd])),
      },
    });
    const request = await generateRequest(formDataProd);
    await createRequestQueueItem(
      request.id,
      { ...formDataProd, existingClientId: '' },
      ACTION_TYPES.CREATE as QUEUE_ACTION,
      61,
    );
    await handler();

    expect(kcAdminClient.clients.find).toHaveBeenCalledWith({
      clientId: formDataProd.clientId,
      max: 1,
      realm: 'standard',
    });
  });
});

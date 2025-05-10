import { expect, jest } from '@jest/globals';
import axios from 'axios';
import { Client } from 'pg';
import { handler } from './main';
import { sendRcNotification } from './utils';

const cssRequestsSample = {
  rows: [
    {
      client_id: 'test-request-monitor-1',
      client_name: 'Test Request Monitor 1',
    },
    {
      client_id: 'test-request-monitor-2',
      client_name: 'Test Request Monitor 2',
    },
  ],
};
const keycloakClientsSample = [
  {
    clientId: 'test-request-monitor-1',
    enabled: true,
  },
];

const keycloakEmptyClientsSample = {
  status: 200,
  data: [],
};

const mockedToken = {
  data: {
    access_token: 'mocked_access_token',
    expires_in: 3600,
    token_type: 'Bearer',
  },
};

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('pg');

jest.mock('./keycloak', () => {
  return {
    getKeycloakClientsByEnv: jest.fn(() => {
      return Promise.resolve(keycloakClientsSample);
    }),
  };
});

jest.mock('./utils', () => {
  return {
    sendRcNotification: jest.fn(() => {
      return Promise.resolve();
    }),
  };
});

describe('Request Monitor', () => {
  let client: Client;
  beforeEach(() => {
    client = new Client({});
    jest.spyOn(Client.prototype, 'connect').mockImplementation((): void => undefined);
  });

  it('should send rocket chat notification is descrepencies found', async () => {
    jest.spyOn(Client.prototype, 'query').mockImplementationOnce(() => Promise.resolve(cssRequestsSample) as any);
    handler();
    await new Promise(process.nextTick);
    expect(sendRcNotification).toHaveBeenCalled();
  });
});

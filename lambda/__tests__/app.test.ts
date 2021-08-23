import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../app/src/main';
import baseEvent from './base-event.json';
import { authenticate } from '../app/src/authenticate';

jest.mock('../app/src/authenticate');
jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

const TEST_IDIR_USERID = 'AABBCCDDEEFFGG';

const mockedAuthenticate = authenticate as jest.Mock<Promise<{ idir_userid: string | null; client_roles: string[] }>>;

describe('/heartbeat endpoints', () => {
  it('should response heartbeat endpoint successfully', async () => {
    const event: APIGatewayProxyEvent = { ...baseEvent, path: '/app/heartbeat' };
    const context: Context = {};

    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        expect(JSON.parse(response.body).length).toEqual(1);
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });
  });
});

describe('requests endpoints', () => {
  let requestId;

  it('should reject the requests without valid auth token', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve(null);
    });

    const event: APIGatewayProxyEvent = { ...baseEvent, path: '/app/requests' };
    const context: Context = {};

    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        expect(response.statusCode).toEqual(401);
        resolve(true);
      });
    });
  });

  it('should create a request successfully', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: TEST_IDIR_USERID, client_roles: [] });
    });

    const sampleRequestPayload = {
      newToSso: false,
      preferredEmail: 'testuser@example.com',
      projectLead: true,
      projectName: 'sampleprojectname',
      publicAccess: false,
    };

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/requests',
      requestContext: { httpMethod: 'POST' },
      body: JSON.stringify(sampleRequestPayload),
    };
    const context: Context = {};

    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        const request = JSON.parse(response.body);
        expect(request.projectName).toEqual(sampleRequestPayload.projectName);
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });
  });

  it('should send all requests successfully', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: TEST_IDIR_USERID, client_roles: [] });
    });

    const event: APIGatewayProxyEvent = { ...baseEvent, path: '/app/requests' };
    const context: Context = {};

    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        const requests = JSON.parse(response.body);

        // it should be more than one as one just got created by the previous test
        expect(requests.length).toBeGreaterThan(0);
        expect(response.statusCode).toEqual(200);

        requestId = requests[0].id;
        resolve(true);
      });
    });
  });

  it('should send the target request successfully', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: TEST_IDIR_USERID, client_roles: [] });
    });

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/request',
      requestContext: { httpMethod: 'POST' },
      body: JSON.stringify({ requestId }),
    };
    const context: Context = {};

    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        const request = JSON.parse(response.body);

        expect(request.id).toBe(requestId);
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });
  });

  it('should update the target request successfully', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: TEST_IDIR_USERID, client_roles: [] });
    });

    const projectName = new Date().getDate() + '';

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/requests',
      requestContext: { httpMethod: 'PUT' },
      body: JSON.stringify({ id: requestId, projectName }),
    };
    const context: Context = {};

    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        const request = JSON.parse(response.body);

        expect(request.projectName).toBe(projectName);
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });
  });
});

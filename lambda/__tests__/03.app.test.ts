import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../app/src/main';
import baseEvent from './base-event.json';
import { authenticate } from '../app/src/authenticate';
import { models } from '../shared/sequelize/models/models';
import { validRequest, bceidRequest } from './validRequest.js';
import { sendEmail } from '../shared/utils/ches';
import { dispatchRequestWorkflow } from '../app/src/github';

// see https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

jest.mock('../app/src/authenticate');
jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('../app/src/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
  };
});

jest.mock('../app/src/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
  };
});

const TEST_IDIR_USERID = 'AABBCCDDEEFFGG';

const mockedAuthenticate = authenticate as jest.Mock<
  Promise<{
    idir_userid: string | null;
    email?: string;
    client_roles: string[];
    given_name: string;
    family_name: string;
  }>
>;

describe('/heartbeat endpoints', () => {
  it('should response heartbeat endpoint successfully', async () => {
    const event: APIGatewayProxyEvent = { ...baseEvent, path: '/app/heartbeat' };
    const context: Context = {};

    const response = await handler(event, context);
    expect(JSON.parse(response.body).length).toEqual(1);
    expect(response.statusCode).toEqual(200);
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

    const response = await handler(event, context);
    expect(response.statusCode).toEqual(401);
  });

  it('should create a request successfully', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: TEST_IDIR_USERID, client_roles: [], given_name: '', family_name: '' });
    });

    const sampleRequestPayload = {
      preferredEmail: 'testuser@example.com',
      projectLead: true,
      projectName: 'sampleprojectname',
      publicAccess: false,
    };

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/requests',
      httpMethod: 'POST',
      body: JSON.stringify(sampleRequestPayload),
    };
    const context: Context = {};

    const response = await handler(event, context);
    const request = JSON.parse(response.body);
    expect(request.projectName).toEqual(sampleRequestPayload.projectName);
    expect(response.statusCode).toEqual(200);
  });

  it('should send all requests successfully', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: TEST_IDIR_USERID, client_roles: [], given_name: '', family_name: '' });
    });

    const event: APIGatewayProxyEvent = { ...baseEvent, path: '/app/requests' };
    const context: Context = {};

    const response = await handler(event, context);
    const requests = JSON.parse(response.body);

    // it should be more than one as one just got created by the previous test
    expect(requests.length).toBeGreaterThan(0);
    expect(response.statusCode).toEqual(200);

    requestId = requests[0].id;
  });

  it('should send the target request successfully', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: TEST_IDIR_USERID, client_roles: [], given_name: '', family_name: '' });
    });

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/request',
      httpMethod: 'POST',
      body: JSON.stringify({ requestId }),
    };
    const context: Context = {};

    const response = await handler(event, context);
    const request = JSON.parse(response.body);

    expect(request.id).toBe(requestId);
    expect(response.statusCode).toEqual(200);
  });

  it('should update the target request successfully', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: TEST_IDIR_USERID, client_roles: [], given_name: '', family_name: '' });
    });

    const projectName = new Date().getDate() + '';

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/requests',
      httpMethod: 'PUT',
      body: JSON.stringify({ id: requestId, projectName }),
    };
    const context: Context = {};

    const response = await handler(event, context);
    const request = JSON.parse(response.body);
    expect(request.projectName).toBe(projectName);
    expect(response.statusCode).toEqual(200);
  });
});

describe('Updating', () => {
  const testUser = 'user';
  const testProjectId = 20;
  beforeEach(() => {
    return Promise.all([
      models.request.create({
        id: testProjectId,
        idirUserid: testUser,
        projectName: 'test',
        status: 'draft',
      }),
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    return models.event
      .destroy({
        where: { requestId: testProjectId },
      })
      .then(() => {
        return models.request.destroy({
          where: { id: testProjectId },
        });
      });
  });

  it('should submit updates to the target request successfully if owned by the user', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({
        idir_userid: testUser,
        email: 'testuser',
        client_roles: [],
        given_name: '',
        family_name: '',
      });
    });

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/requests',
      httpMethod: 'PUT',
      body: JSON.stringify({ id: testProjectId, ...validRequest }),
      queryStringParameters: { submit: true },
    };
    const context: Context = {};

    const response = await handler(event, context);
    expect(response.statusCode).toEqual(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('should allow updates to the target request if requester is admin', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: 'random', client_roles: ['sso-admin'], given_name: '', family_name: '' });
    });

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/requests',
      httpMethod: 'PUT',
      body: JSON.stringify({ id: testProjectId, ...validRequest }),
      queryStringParameters: { submit: true },
    };
    const context: Context = {};

    const response = await handler(event, context);
    expect(response.statusCode).toEqual(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('should notify IDIM if the request is for bceid with production', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: testUser, client_roles: [], given_name: '', family_name: '' });
    });

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/requests',
      httpMethod: 'PUT',
      body: JSON.stringify({ id: testProjectId, ...bceidRequest }),
      queryStringParameters: { submit: true },
    };
    const context: Context = {};

    const response = await handler(event, context);
    expect(response.statusCode).toEqual(200);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('should create all requested environments for idir only requests', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: testUser, client_roles: [], given_name: '', family_name: '' });
    });

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/requests',
      httpMethod: 'PUT',
      body: JSON.stringify({ id: testProjectId, ...validRequest }),
      queryStringParameters: { submit: true },
    };
    const context: Context = {};

    const response = await handler(event, context);
    const request = JSON.parse(response.body);
    expect(response.statusCode).toEqual(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(dispatchRequestWorkflow).toHaveBeenCalledWith({
      requestId: request.id,
      clientName: request.clientName,
      realmName: request.realm,
      validRedirectUris: {
        dev: request.devValidRedirectUris,
        test: request.testValidRedirectUris,
        prod: request.prodValidRedirectUris,
      },
      environments: request.environments,
      publicAccess: request.publicAccess,
      browserFlowOverride: null,
    });
  });

  it('should not create bceid prod if it is not approved', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: testUser, client_roles: [], given_name: '', family_name: '' });
    });

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/requests',
      httpMethod: 'PUT',
      body: JSON.stringify({ id: testProjectId, ...bceidRequest }),
      queryStringParameters: { submit: true },
    };
    const context: Context = {};

    const response = await handler(event, context);
    const request = JSON.parse(response.body);
    expect(response.statusCode).toEqual(200);
    expect(dispatchRequestWorkflow).toHaveBeenCalledWith({
      requestId: request.id,
      clientName: request.clientName,
      realmName: request.realm,
      validRedirectUris: {
        dev: request.devValidRedirectUris,
        test: request.testValidRedirectUris,
        prod: request.prodValidRedirectUris,
      },
      environments: ['dev', 'test'],
      publicAccess: request.publicAccess,
      browserFlowOverride: null,
    });
  });

  it('should include browser flow override in dispatch', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({ idir_userid: testUser, client_roles: [], given_name: '', family_name: '' });
    });

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: '/app/requests',
      httpMethod: 'PUT',
      body: JSON.stringify({ id: testProjectId, ...validRequest, browserFlowOverride: 'asdf' }),
      queryStringParameters: { submit: true },
    };
    const context: Context = {};

    const response = await handler(event, context);
    const request = JSON.parse(response.body);
    expect(response.statusCode).toEqual(200);
    expect(dispatchRequestWorkflow).toHaveBeenCalledWith({
      requestId: request.id,
      clientName: request.clientName,
      realmName: request.realm,
      validRedirectUris: {
        dev: request.devValidRedirectUris,
        test: request.testValidRedirectUris,
        prod: request.prodValidRedirectUris,
      },
      environments: ['dev', 'test', 'prod'],
      publicAccess: request.publicAccess,
      browserFlowOverride: 'asdf',
    });
  });
});

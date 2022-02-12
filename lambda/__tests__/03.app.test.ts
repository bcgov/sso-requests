import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../app/src/main';
import baseEvent from './base-event.json';
import { authenticate } from '../app/src/authenticate';
import { models } from '../shared/sequelize/models/models';
import { validRequest, bceidRequest } from './validRequest.js';
import { sendEmail } from '../shared/utils/ches';
import { dispatchRequestWorkflow } from '../app/src/github';
import { TEST_IDIR_USERID, TEST_IDIR_EMAIL, AuthMock } from './00.db.test';

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

jest.mock('../app/src/utils/helpers', () => {
  const actual = jest.requireActual('../app/src/utils/helpers');
  return {
    ...actual,
    getUsersTeams: jest.fn(() => []),
  };
});

jest.mock('../app/src/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
  };
});

const mockedAuthenticate = authenticate as jest.Mock<AuthMock>;

describe('requests endpoints', () => {
  let requestId;

  beforeEach(() => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({
        idir_userid: TEST_IDIR_USERID,
        email: TEST_IDIR_EMAIL,
        client_roles: [],
        given_name: '',
        family_name: '',
      });
    });
  });

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
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({
        idir_userid: TEST_IDIR_USERID,
        email: TEST_IDIR_EMAIL,
        client_roles: [],
        given_name: '',
        family_name: '',
      });
    });

    return Promise.all([
      models.request.create({
        id: testProjectId,
        idirUserid: TEST_IDIR_USERID,
        projectName: 'test',
        status: 'draft',
        projectLead: true,
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

  it('should create all requested environments for idir only requests', async () => {
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

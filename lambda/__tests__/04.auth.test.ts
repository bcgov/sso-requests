import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../app/src/main';
import baseEvent from './base-event.json';
import { authenticate } from '../app/src/authenticate';
import { TEST_IDIR_USERID, TEST_IDIR_EMAIL, AuthMock } from './00.db.test';

const { path: baseUrl } = baseEvent;

jest.mock('../app/src/authenticate');
const mockedAuthenticate = authenticate as jest.Mock<AuthMock>;

describe('/non-logged in user endpoints', () => {
  it('should response heartbeat endpoint successfully', async () => {
    const event: APIGatewayProxyEvent = { ...baseEvent, path: `${baseUrl}/heartbeat` };

    const response = await handler(event);
    expect(JSON.parse(response.body).length).toEqual(1);
    expect(response.statusCode).toEqual(200);
  });

  it('should be redirected without team token to validate', async () => {
    const event: APIGatewayProxyEvent = { ...baseEvent, path: `${baseUrl}/teams/verify` };

    const response = await handler(event);
    expect(response.statusCode).toEqual(302);
    expect(response.headers.location).toEqual('/verify-user?message=notoken');
  });

  it('should have an error with invalid team invitation token', async () => {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/teams/verify`,
      queryStringParameters: { token: 'qerasdf' },
    };

    const response = await handler(event);
    expect(response.statusCode).toEqual(302);
    expect(response.headers.location).toEqual('/verify-user?message=malformed');
  });
});

describe('/logged-in endpoints', () => {
  it('should reject the non-logged user to list integrations', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve(null);
    });

    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'POST', path: `${baseUrl}/requests-all` };

    const response = await handler(event);
    expect(response.statusCode).toEqual(401);
    expect(response.body).toContain('not authorized');
  });

  it('should allow the logged-in user to list their integrations', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({
        idir_userid: TEST_IDIR_USERID,
        email: TEST_IDIR_EMAIL,
        client_roles: [],
        given_name: '',
        family_name: '',
      });
    });

    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'GET', path: `${baseUrl}/requests` };

    const response = await handler(event);
    expect(response.statusCode).toEqual(200);
    expect(response.body).toContain('[');
  });

  it('should reject the non-logged user to create an integration', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve(null);
    });

    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'POST', path: `${baseUrl}/requests` };

    const response = await handler(event);
    expect(response.statusCode).toEqual(401);
    expect(response.body).toContain('not authorized');
  });

  it('should reject the logged-in user with DB constraint violations when creating an integration', async () => {
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({
        idir_userid: TEST_IDIR_USERID,
        email: TEST_IDIR_EMAIL,
        client_roles: [],
        given_name: '',
        family_name: '',
      });
    });

    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'POST', path: `${baseUrl}/requests` };

    const response = await handler(event);
    expect(response.statusCode).toEqual(422);
    expect(response.body).toContain('notNull Violation');
  });
});

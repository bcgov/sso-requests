import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../app/src/main';
import baseEvent from './base-event.json';
import { authenticate } from '../app/src/authenticate';
import { TEST_IDIR_USERID, TEST_IDIR_USERID_2, TEST_IDIR_EMAIL, TEST_IDIR_EMAIL_2, AuthMock } from './00.db.test';
import { sendEmail } from '../shared/utils/ches';

const { path: baseUrl } = baseEvent;

jest.mock('../app/src/authenticate');
jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

const mockedAuthenticate = authenticate as jest.Mock<AuthMock>;
const createMockAuth = (idir_userid, email) => {
  mockedAuthenticate.mockImplementation(() => {
    return Promise.resolve({
      idir_userid,
      email,
      client_roles: [],
      given_name: '',
      family_name: '',
    });
  });
};

let testUserId;

const adminEmail = 'admin@email.com';
const pendingAdminEmail = 'pendingAdmin@email.com';
const userEmail = 'user@email.com';

describe('User and Teams', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should find current user successfully', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = { ...baseEvent, path: `${baseUrl}/me` };
    const context: Context = {};

    const response = await handler(event, context);
    const user = JSON.parse(response.body);
    expect(user.idirUserid).toEqual(TEST_IDIR_USERID);
    expect(user.idirEmail).toEqual(TEST_IDIR_EMAIL);
    expect(response.statusCode).toEqual(200);
  });

  it('should find empty team list successfully', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'GET', path: `${baseUrl}/teams` };
    const context: Context = {};

    const response = await handler(event, context);
    const teams = JSON.parse(response.body);
    expect(teams.length).toEqual(0);
    expect(response.statusCode).toEqual(200);
  });

  it('should create a team associated with the authenticated user successfully', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: `${baseUrl}/teams`,
      body: JSON.stringify({
        name: 'ssoteam',
        members: [],
      }),
    };

    const context: Context = {};

    const response = await handler(event, context);
    const team = JSON.parse(response.body);
    expect(team.name).toEqual('ssoteam');

    expect(response.statusCode).toEqual(200);
  });

  it('should find one team list successfully', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'GET', path: `${baseUrl}/teams` };
    const context: Context = {};

    const response = await handler(event, context);
    const teams = JSON.parse(response.body);
    expect(teams.length).toEqual(1);
    expect(response.statusCode).toEqual(200);
  });

  it('should find empty team list for the second user successfully', async () => {
    createMockAuth(TEST_IDIR_USERID_2, TEST_IDIR_EMAIL_2);
    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'GET', path: `${baseUrl}/teams` };
    const context: Context = {};

    const response = await handler(event, context);
    const teams = JSON.parse(response.body);
    expect(teams.length).toEqual(0);
    expect(response.statusCode).toEqual(200);
  });

  it('should update the first team name successfully', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'PUT',
      path: `${baseUrl}/teams/1`,
      body: JSON.stringify({
        name: 'ssoteam2',
      }),
    };
    const context: Context = {};

    const response = await handler(event, context);
    const team = JSON.parse(response.body);
    expect(team.name).toEqual('ssoteam2');
    expect(response.statusCode).toEqual(200);
  });

  it('Should allow an admin to add users to a team', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: `${baseUrl}/teams/1/members`,
      body: JSON.stringify([
        {
          idirEmail: userEmail,
          role: 'user',
        },
        {
          idirEmail: adminEmail,
          role: 'admin',
        },
        {
          idirEmail: pendingAdminEmail,
          role: 'admin',
        },
      ]),
    };
    const context: Context = {};
    const response = await handler(event, context);
    const body = JSON.parse(response.body);
    testUserId = body[0];
    expect(response.statusCode).toEqual(200);
  });

  it('Should block non-admins from adding users to a team', async () => {
    createMockAuth(TEST_IDIR_USERID_2, TEST_IDIR_EMAIL_2);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: `${baseUrl}/teams/1/members`,
      body: JSON.stringify([
        {
          idirEmail: 'test2@email.com',
          role: 'admin',
        },
      ]),
    };
    const context: Context = {};
    const response = await handler(event, context);
    expect(response.statusCode).toEqual(401);
  });

  it('Should allow team members to read team membership', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'GET', path: `${baseUrl}/teams/1/members` };
    const context: Context = {};
    const response = await handler(event, context);
    expect(response.statusCode).toEqual(200);
  });

  it('Should block non-team members from reading team membership', async () => {
    createMockAuth(TEST_IDIR_USERID_2, TEST_IDIR_EMAIL_2);
    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'GET', path: `${baseUrl}/teams/1/members` };
    const context: Context = {};
    const response = await handler(event, context);
    const ressult = JSON.parse(response.body);
    expect(response.statusCode).toEqual(200);
    expect(ressult).toEqual([]);
  });

  it('Should block pending admins from removing team members', async () => {
    createMockAuth(pendingAdminEmail, pendingAdminEmail);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'DELETE',
      path: `${baseUrl}/teams/1/members/${testUserId}`,
    };
    const context: Context = {};
    const response = await handler(event, context);
    expect(response.statusCode).toEqual(401);
  });

  it('Should block team users from removing team members', async () => {
    createMockAuth(userEmail, userEmail);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'DELETE',
      path: `${baseUrl}/teams/1/members/${testUserId}`,
    };
    const context: Context = {};
    const response = await handler(event, context);
    expect(response.statusCode).toEqual(401);
  });

  it('Should allow admins to remove team members', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'DELETE',
      path: `${baseUrl}/teams/1/members/${testUserId}`,
    };
    const context: Context = {};
    const response = await handler(event, context);
    expect(response.statusCode).toEqual(200);
  });

  it('Should allow admins to resend invitations', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: `${baseUrl}/teams/1/invite`,
      body: JSON.stringify([
        {
          idirEmail: 'test2@email.com',
          role: 'admin',
        },
      ]),
    };
    const context: Context = {};
    const response = await handler(event, context);
    expect(response.statusCode).toEqual(200);
    expect(sendEmail).toHaveBeenCalled();
  });

  it('Should not allow non-admins to resend invitations', async () => {
    createMockAuth(TEST_IDIR_USERID_2, TEST_IDIR_EMAIL_2);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: `${baseUrl}/teams/1/invite`,
      body: JSON.stringify([
        {
          idirEmail: 'test2@email.com',
          role: 'admin',
        },
      ]),
    };
    const context: Context = {};
    const response = await handler(event, context);
    expect(response.statusCode).toEqual(401);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('should delete the first team successfully', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'DELETE',
      path: `${baseUrl}/teams/1`,
    };
    const context: Context = {};

    const response = await handler(event, context);
    const ressult = JSON.parse(response.body);
    expect(ressult).toEqual(true);
    expect(response.statusCode).toEqual(200);
  });
});

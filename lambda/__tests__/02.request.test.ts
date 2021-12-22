import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../app/src/main';
import baseEvent from './base-event.json';
import { authenticate } from '../app/src/authenticate';
import { TEST_IDIR_USERID, TEST_IDIR_EMAIL, AuthMock } from './00.db.test';
import { models } from '../shared/sequelize/models/models';
import { sendEmail } from '../shared/utils/ches';

jest.mock('../app/src/authenticate');
jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('../app/src/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
    closeOpenPullRequests: jest.fn(() => [, null]),
  };
});

const mockedAuthenticate = authenticate as jest.Mock<AuthMock>;
mockedAuthenticate.mockImplementation(() => {
  return Promise.resolve({
    idir_userid: TEST_IDIR_USERID,
    email: TEST_IDIR_EMAIL,
    client_roles: [],
    given_name: '',
    family_name: '',
  });
});

const memberEmail = 'newemail@new.com';
const memberIdir = 'AAAAAAAA';
let teamWithMember;
let teamRequest;

describe('Requests', () => {
  it('should create a request successfully', async () => {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: '/app/requests',
      body: JSON.stringify({
        projectName: 'test',
        projectLead: true,
        preferredEmail: 'me@me.com',
        publicAccess: 'yes',
      }),
    };

    const context: Context = {};

    const response = await handler(event, context);
    const result = JSON.parse(response.body);
    expect(result.idirUserid).toEqual(TEST_IDIR_USERID);
    expect(response.statusCode).toEqual(200);
  });
});

describe('Creating Teams', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  let user;
  beforeAll(async () => {
    user = await models.user.findOne({ where: { idir_userid: TEST_IDIR_USERID } });
  });

  it('Should allow users to create a team and default them to admin', async () => {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: '/app/teams',
      body: JSON.stringify({
        name: 'test',
        members: [],
      }),
    };

    const context: Context = {};

    const response = await handler(event, context);
    expect(response.statusCode).toEqual(200);

    const [userTeam, team] = await Promise.all([
      models.usersTeam.findOne({ where: { userId: user.id }, plain: true }),
      models.team.findOne({ where: { name: 'test' }, plain: true }),
    ]);
    expect(userTeam.userId).toBe(user.id);
    expect(userTeam.teamId).toBe(team.id);
    expect(userTeam.pending).toBe(false);
    expect(userTeam.role).toBe('admin');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Should create a pending member if added to a team and send an invitation email', async () => {
    const newMemberEmail = 'newemail@new.com';
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: '/app/teams',
      body: JSON.stringify({
        name: 'test-2',
        members: [
          {
            email: newMemberEmail,
            role: 'user',
          },
        ],
      }),
    };

    const context: Context = {};

    const response = await handler(event, context);
    const newUser = await models.user.findOne({ where: { idirEmail: newMemberEmail } });

    const [userTeam, team] = await Promise.all([
      models.usersTeam.findOne({ where: { userId: newUser.id }, plain: true }),
      models.team.findOne({ where: { name: 'test-2' }, plain: true }),
    ]);
    teamWithMember = team;
    expect(userTeam.userId).toBe(newUser.id);
    expect(userTeam.teamId).toBe(team.id);
    expect(userTeam.pending).toBe(true);
    expect(userTeam.role).toBe('user');
    expect(sendEmail).toHaveBeenCalled();

    expect(response.statusCode).toEqual(200);
  });

  it('Should not re-create a member if the given email already exists', async () => {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: '/app/teams',
      body: JSON.stringify({
        name: 'test-2',
        members: [
          {
            email: memberEmail,
            role: 'user',
          },
        ],
      }),
    };

    const context: Context = {};

    const response = await handler(event, context);
    const newUsers = await models.user.findAll({ where: { idirEmail: memberEmail } });

    expect(newUsers.length).toBe(1);
    expect(sendEmail).toHaveBeenCalled();
    expect(response.statusCode).toEqual(200);
  });

  it('Should allow users to create a request belonging to a team', async () => {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: '/app/requests',
      body: JSON.stringify({
        projectName: 'test project',
        projectLead: true,
        preferredEmail: TEST_IDIR_EMAIL,
        usesTeam: true,
        teamId: teamWithMember.id,
      }),
    };

    const context: Context = {};
    const response = await handler(event, context);
    teamRequest = JSON.parse(response.body);

    expect(JSON.parse(response.body).teamId).toBe(teamWithMember.id);
    expect(response.statusCode).toEqual(200);
  });
});

describe('Team member permissions', () => {
  beforeEach(() => {
    // Log in as team member
    mockedAuthenticate.mockImplementation(() => {
      return Promise.resolve({
        idir_userid: memberIdir,
        email: memberEmail,
        client_roles: [],
        given_name: '',
        family_name: '',
      });
    });
  });

  it('Should allow team members to view a request belonging to a team', async () => {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: '/app/request',
      body: JSON.stringify({
        requestId: teamRequest.id,
      }),
    };

    const context: Context = {};
    const response = await handler(event, context);
    expect(response.statusCode).toEqual(200);
  });

  it('Should allow team members to edit a request belonging to a team', async () => {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'PUT',
      path: '/app/requests',
      body: JSON.stringify({
        id: teamRequest.id,
        publicAccess: true,
      }),
    };

    const context: Context = {};
    const response = await handler(event, context);
    expect(response.statusCode).toEqual(200);
    expect(JSON.parse(response.body).publicAccess).toBe(true);
  });

  it('Should allow team members to delete a request belonging to a team', async () => {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'DELETE',
      path: '/app/requests',
      queryStringParameters: { id: teamRequest.id },
    };

    const context: Context = {};
    const response = await handler(event, context);
    console.log(response);
    expect(response.statusCode).toEqual(200);
    const updatedRequest = await models.request.findOne({ where: { id: teamRequest.id } });
    expect(updatedRequest.archived).toBe(true);
  });
});

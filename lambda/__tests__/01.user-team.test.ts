import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../app/src/main';
import baseEvent from './base-event.json';
import { authenticate } from '../app/src/authenticate';
import { models } from '../shared/sequelize/models/models';
import { validRequest, bceidRequest } from './validRequest.js';
import { sendEmail } from '../shared/utils/ches';
import { dispatchRequestWorkflow } from '../app/src/github';
import { TEST_IDIR_USERID, TEST_IDIR_USERID_2, TEST_IDIR_EMAIL, TEST_IDIR_EMAIL_2, AuthMock } from './00.db.test';

jest.mock('../app/src/authenticate');

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

describe('User and Teams', () => {
  it('should find current user successfully', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = { ...baseEvent, path: '/app/me' };
    const context: Context = {};

    const response = await handler(event, context);
    const user = JSON.parse(response.body);
    expect(user.idirUserid).toEqual(TEST_IDIR_USERID);
    expect(user.idirEmail).toEqual(TEST_IDIR_EMAIL);
    expect(response.statusCode).toEqual(200);
  });

  it('should find empty team list successfully', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'GET', path: '/app/teams' };
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
      path: '/app/teams',
      body: JSON.stringify({
        name: 'ssoteam',
        members: [],
      }),
    };

    const context: Context = {};

    const response = await handler(event, context);
    console.log(response.body, '====================================');
    const team = JSON.parse(response.body);
    expect(team.name).toEqual('ssoteam');

    expect(response.statusCode).toEqual(200);
  });

  it('should find one team list successfully', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'GET', path: '/app/teams' };
    const context: Context = {};

    const response = await handler(event, context);
    const teams = JSON.parse(response.body);
    expect(teams.length).toEqual(1);
    expect(response.statusCode).toEqual(200);
  });

  it('should find empty team list for the second user successfully', async () => {
    createMockAuth(TEST_IDIR_USERID_2, TEST_IDIR_EMAIL_2);
    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'GET', path: '/app/teams' };
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
      path: '/app/teams/1',
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

  it('should delete the first team successfully', async () => {
    createMockAuth(TEST_IDIR_USERID, TEST_IDIR_EMAIL);
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'DELETE',
      path: '/app/teams/1',
    };
    const context: Context = {};

    const response = await handler(event, context);
    const ressult = JSON.parse(response.body);
    expect(ressult).toEqual(true);
    expect(response.statusCode).toEqual(200);
  });
});

import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../app/src/main';
import baseEvent from './base-event.json';
import { authenticate } from '../app/src/authenticate';
import { models } from '../shared/sequelize/models/models';
import { validRequest, bceidRequest } from './validRequest.js';
import { sendEmail } from '../shared/utils/ches';
import { dispatchRequestWorkflow } from '../app/src/github';
import { TEST_IDIR_USERID, TEST_IDIR_EMAIL, AuthMock } from './00.db.test';

jest.mock('../app/src/authenticate');

const mockedAuthenticate = authenticate as jest.Mock<AuthMock>;

describe('User and Teams', () => {
  mockedAuthenticate.mockImplementation(() => {
    return Promise.resolve({
      idir_userid: TEST_IDIR_USERID,
      email: TEST_IDIR_EMAIL,
      client_roles: [],
      given_name: '',
      family_name: '',
    });
  });

  it('should find current user successfully', async () => {
    const event: APIGatewayProxyEvent = { ...baseEvent, path: '/app/me' };
    const context: Context = {};

    const response = await handler(event, context);
    const user = JSON.parse(response.body);
    expect(user.idirUserid).toEqual(TEST_IDIR_USERID);
    expect(user.idirEmail).toEqual(TEST_IDIR_EMAIL);
    expect(response.statusCode).toEqual(200);
  });

  it('should find empty team list successfully', async () => {
    const event: APIGatewayProxyEvent = { ...baseEvent, httpMethod: 'GET', path: '/app/teams' };
    const context: Context = {};

    const response = await handler(event, context);
    const teams = JSON.parse(response.body);
    expect(teams.length).toEqual(0);
    expect(response.statusCode).toEqual(200);
  });
});

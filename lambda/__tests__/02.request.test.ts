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

describe('Requests', () => {
  mockedAuthenticate.mockImplementation(() => {
    return Promise.resolve({
      idir_userid: TEST_IDIR_USERID,
      email: TEST_IDIR_EMAIL,
      client_roles: [],
      given_name: '',
      family_name: '',
    });
  });

  it('should create a request successfully', async () => {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      httpMethod: 'POST',
      path: '/app/requests',
      body: JSON.stringify({
        projectName: 'test',
        projectLead: 'yes',
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

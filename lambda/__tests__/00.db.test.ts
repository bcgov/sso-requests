import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../db/src/main';
import { sequelize, models, modelNames } from '../shared/sequelize/models/models';

// see https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
const event: APIGatewayProxyEvent = {
  httpMethod: 'GET',
  path: '/',
  headers: {
    accept: 'application/json',
    'accept-encoding': 'gzip',
    'accept-language': 'en-US,en;q=0.9',
    connection: 'keep-alive',
    host: 'xxxxxxxx.ca-central-1.elb.amazonaws.com',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
    'x-forwarded-port': '80',
    'x-forwarded-proto': 'http',
    'x-imforwards': '20',
  },
  body: null,
  isBase64Encoded: false,
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  resource: '',
};

const context: Context = {};

export const TEST_IDIR_USERID = 'AABBCCDDEEFFGG';
export const TEST_IDIR_USERID_2 = 'AABBCCDDEEFFGGHH';
export const TEST_IDIR_EMAIL = 'testuser@example.com';
export const TEST_IDIR_EMAIL_2 = 'testuser2@example.com';

export type AuthMock = Promise<{
  idir_userid: string | null;
  email?: string;
  client_roles: string[];
  given_name: string;
  family_name: string;
}>;

beforeAll(async () => {
  jest.clearAllMocks();
  const query =
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'";

  let tableNames = await sequelize.query(query);
  tableNames = tableNames.map((v) => v[0]);
  for (let x = 0; x < tableNames.length; x++) {
    await sequelize.query(`DROP TABLE "${tableNames[x]}" CASCADE`);
  }
});

describe('DB migration', () => {
  it('should migrate db successfully', async () => {
    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        expect(response.body.success).toEqual(true);
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });
  });
});

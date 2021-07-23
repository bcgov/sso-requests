import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../app/src/main';

const event: APIGatewayProxyEvent = {
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
  requestContext: { httpMethod: 'GET' },
  body: '',
  path: '/app/heartbeat',
  queryStringParameters: {},
};

const context: Context = {};

describe('App Heartbeat', () => {
  it('should response heartbeat endpoint successfully', async () => {
    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        expect(JSON.parse(response.body).length).toEqual(1);
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });
  });
});

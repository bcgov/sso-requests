import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { Response } from './interfaces';
import { wakeUpAll } from './actions/wakeUp';
import createEvent from './actions/updateStatus';

const responseHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Origin': 'https://bcgov.github.io',
  'Access-Control-Allow-Methods': 'OPTIONS,PUT,GET',
};

const response = (data?: Response) => {
  return {
    isBase64Encoded: false,
    headers: responseHeaders,
    statusCode: 200,
    body: JSON.stringify({ success: true }),
    ...data,
  };
};

const unauthorizedError = (body = 'not authorized') => {
  return response({ statusCode: 401, body: JSON.stringify(body) });
};

const unprocessableEntityError = (body = 'unable to process the request') => {
  return response({ statusCode: 422, body: JSON.stringify(body) });
};

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  // Sequelize waits ~10seconds to drop connection, delaying API response.
  // Use this to prevent, see https://forum.serverless.com/t/lambda-with-rds-using-vpc-works-slow/1261/7 for more
  context.callbackWaitsForEmptyEventLoop = false;
  const { headers, body, requestContext } = event;
  const { httpMethod } = requestContext;
  console.log('event.body', body);

  const { Authorization } = headers;
  if (Authorization !== process.env.GH_SECRET) return callback(null, unauthorizedError());

  try {
    if (httpMethod === 'PUT') {
      const result = await createEvent(event);
      return callback(null, response(result));
    }
    if (httpMethod === 'GET') {
      const result = await wakeUpAll();
      return callback(null, response(result));
    }
  } catch (err) {
    console.error(err);
    callback(null, unprocessableEntityError(err.message || err));
  }
};

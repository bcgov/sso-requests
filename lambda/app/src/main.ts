import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { authenticate } from './authenticate';
import { createRequest, getRequests } from './routes';

const responseHeaders = {
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Origin': 'https://bcgov.github.io',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Access-Control-Allow-Credentials': 'true',
  },
};

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  const { headers, requestContext, body, path } = event;
  const { httpMethod } = requestContext;
  if (httpMethod === 'OPTIONS') return callback(null, { headers: responseHeaders });

  const authenticated = await authenticate(headers);
  if (!authenticated) {
    const response = {
      statusCode: 401,
      headers: responseHeaders,
    };
    return callback(null, response);
  }

  let response = {};

  if (path === '/requests') {
    if (httpMethod === 'POST') {
      response = await createRequest(JSON.parse(body));
    }
    if (httpMethod === 'GET') {
      response = await getRequests();
    }
  }

  response = {
    ...response,
    isBase64Encoded: false,
    headers: responseHeaders,
  };

  callback(null, response);
};

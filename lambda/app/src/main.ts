import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { authenticate } from './authenticate';
import { getEvents } from './routes/events';
import { createRequest, getRequests, getRequestAll, getRequest, updateRequest, deleteRequest } from './routes/requests';
import { getClient } from './routes/client';
import { getInstallation } from './routes/installation';
import { wakeUpAll } from './routes/heartbeat';

const allowedOrigin = process.env.LOCAL_DEV === 'true' ? 'http://localhost:3000' : 'https://bcgov.github.io';

const responseHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT, DELETE',
  'Access-Control-Allow-Credentials': 'true',
};

const BASE_PATH = '/app';

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const { headers, requestContext, body, path, queryStringParameters } = event;
  const { submit, include, id } = queryStringParameters || {};
  const { httpMethod } = requestContext;

  if (httpMethod === 'OPTIONS') return callback(null, { headers: responseHeaders });

  if (path === `${BASE_PATH}/heartbeat`) {
    const result = await wakeUpAll();
    return callback(null, { ...result, headers: responseHeaders });
  }

  const session = await authenticate(headers);
  if (!session) {
    const response = {
      statusCode: 401,
      headers: responseHeaders,
    };
    return callback(null, response);
  }

  let response: any = {
    statusCode: 404,
    headers: responseHeaders,
  };

  console.log('REQUEST PATH', path);
  if (path === `${BASE_PATH}/requests-all`) {
    if (httpMethod === 'POST') {
      response = await getRequestAll(session, JSON.parse(body));
    }
  } else if (path === `${BASE_PATH}/requests`) {
    if (httpMethod === 'POST') {
      response = await createRequest(session, JSON.parse(body));
    } else if (httpMethod === 'GET') {
      response = await getRequests(session, include);
    } else if (httpMethod === 'PUT') {
      response = await updateRequest(session, JSON.parse(body), submit);
    } else if (httpMethod === 'DELETE') {
      response = await deleteRequest(session, Number(id));
    }
  } else if (path === `${BASE_PATH}/request`) {
    if (httpMethod === 'POST') {
      response = await getRequest(session, JSON.parse(body));
    }
  } else if (path === `${BASE_PATH}/installation`) {
    if (httpMethod === 'POST') {
      response = await getInstallation(session, JSON.parse(body));
    }
  } else if (path === `${BASE_PATH}/client`) {
    if (httpMethod === 'POST') {
      response = await getClient(session, JSON.parse(body));
    }
  } else if (path === `${BASE_PATH}/events`) {
    if (httpMethod === 'POST') {
      response = await getEvents(session, JSON.parse(body));
    }
  }

  response = {
    ...response,
    isBase64Encoded: false,
    headers: responseHeaders,
  };

  callback(null, response);
};

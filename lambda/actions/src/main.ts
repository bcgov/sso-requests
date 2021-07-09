import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { models, sequelize } from '../../shared/sequelize/models/models';

const responseHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,PUT',
};

const unauthorizedResponse = {
  isBase64Encoded: false,
  headers: responseHeaders,
  statusCode: 401,
  body: 'not authorized',
};

const handleUpdate = async (updates, where) => {
  try {
    const result = await models.request.update(updates, { where });
  } catch (err) {
    console.error(err);
  }
};

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  const { headers, body, queryStringParameters } = event;
  const { prNumber, prSuccess, planSuccess, applySuccess, id } = JSON.parse(body);
  const { Authorization } = headers;
  if (Authorization !== process.env.GH_SECRET) return callback(null, unauthorizedResponse);

  const { status } = queryStringParameters || {};

  if (status === 'create') handleUpdate({ prNumber, prSuccess, prCreatedAt: sequelize.fn('NOW') }, { id });
  else if (status === 'plan') handleUpdate({ planSuccess, planRuntime: sequelize.fn('NOW') }, { prNumber });
  else if (status === 'apply') handleUpdate({ applySuccess, applyRuntime: sequelize.fn('NOW') }, { prNumber });

  const response = {
    isBase64Encoded: false,
    headers: responseHeaders,
    statusCode: 200,
    body: 'authorized',
  };

  callback(null, response);
};

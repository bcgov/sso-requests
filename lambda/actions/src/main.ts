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

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  const { headers, body } = event;
  const { prNumber, success, id } = JSON.parse(body);
  const { Authorization } = headers;
  // const { httpMethod } = requestContext;
  if (Authorization !== process.env.GH_SECRET) return callback(null, unauthorizedResponse);

  try {
    const result = await models.request.update(
      { prNumber, success, prCreatedAt: sequelize.fn('NOW') },
      { where: { id } }
    );
  } catch (err) {
    console.error(err);
  }

  const response = {
    isBase64Encoded: false,
    headers: responseHeaders,
    statusCode: 200,
    body: 'authorized',
  };

  callback(null, response);
};

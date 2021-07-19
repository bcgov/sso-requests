import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { models, sequelize } from '../../shared/sequelize/models/models';
import { Response } from './interfaces';

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

const createEvent = async (data) => {
  try {
    const result = await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
};

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  const { headers, body, queryStringParameters } = event;
  const { prNumber, prSuccess, planSuccess, applySuccess, id } = JSON.parse(body);
  const { Authorization } = headers;
  // if (Authorization !== process.env.GH_SECRET) return callback(null, unauthorizedResponse);

  const { status } = queryStringParameters || {};

  let response: Response = {
    isBase64Encoded: false,
    headers: responseHeaders,
  };

  try {
    if (status === 'create') {
      await Promise.all([
        models.request.update({ prNumber }, { where: { id } }),
        createEvent({ eventCode: `request-pr-${prSuccess}`, requestId: id }),
      ]);
    } else {
      // After creation, gh action only has prNumber to reference request. Using this to grab the requestId first
      const { id: requestId } = await models.request.findOne({ where: { prNumber } });
      if (status === 'plan') await createEvent({ eventCode: `request-plan-${planSuccess}`, requestId });
      else if (status === 'apply') await createEvent({ eventCode: `request-apply-${applySuccess}`, requestId });
    }
    response.statusCode = 200;
    response.body = '{"success": true}';
    callback(null, response);
  } catch (err) {
    response.statusCode = 422;
    response.body = '{"success": false}';
    callback(null, response);
  }
};

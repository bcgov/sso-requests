import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { models, sequelize } from '../../shared/sequelize/models/models';
import { Response } from './interfaces';

const responseHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,PUT',
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

const UnprocessableEntityError = (body = 'unable to process the request') => {
  return response({ statusCode: 422, body: JSON.stringify(body) });
};

const createEvent = async (data) => {
  try {
    const result = await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
};

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  // Sequelize waits ~10seconds to drop connection, delaying API response.
  // Use this to prevent, see https://forum.serverless.com/t/lambda-with-rds-using-vpc-works-slow/1261/7 for more
  context.callbackWaitsForEmptyEventLoop = false;
  const { headers, body, queryStringParameters } = event;
  console.log('event.body', body);
  const { prNumber, prSuccess, planSuccess, applySuccess, id, actionNumber, planDetails } = JSON.parse(body);
  const { Authorization } = headers;
  if (Authorization !== process.env.GH_SECRET) return callback(null, unauthorizedError());

  const { status: githubActionsStage } = queryStringParameters || {};

  try {
    if (githubActionsStage === 'create') {
      const status = String(prSuccess) === 'true' ? 'pr' : 'prFailed';
      await Promise.all([
        models.request.update({ prNumber, status, actionNumber }, { where: { id } }),
        createEvent({ eventCode: `request-pr-${prSuccess}`, requestId: id }),
      ]);
    } else {
      // After creation, gh action only has prNumber to reference request. Using this to grab the requestId first
      const { id: requestId, status: currentStatus } = await models.request.findOne({ where: { prNumber } });
      const isAlreadyApplied = currentStatus === 'applied';
      if (githubActionsStage === 'plan') {
        const status = String(planSuccess) === 'true' ? 'planned' : 'planFailed';
        await Promise.all([
          !isAlreadyApplied && models.request.update({ status }, { where: { id: requestId } }),
          createEvent({ eventCode: `request-plan-${planSuccess}`, requestId, planDetails }),
        ]);
      }
      if (githubActionsStage === 'apply') {
        const status = String(applySuccess) === 'true' ? 'applied' : 'applyFailed';
        await Promise.all([
          models.request.update({ status }, { where: { id: requestId } }),
          createEvent({ eventCode: `request-apply-${planSuccess}`, requestId }),
        ]);
      }
    }
    callback(null, response());
  } catch (err) {
    console.error(err);
    callback(null, UnprocessableEntityError(err.message || err));
  }
};

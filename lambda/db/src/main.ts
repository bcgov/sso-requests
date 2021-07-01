import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import models from '../../shared/sequelize/models/models';

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  const { headers } = event;

  try {
    console.log(models);
  } catch (e) {
    console.log('errored out', e);
  }

  const response = {
    statusCode: 200,
    headers: { time: new Date() },
    body: 'okay',
  };

  callback(null, response);
};

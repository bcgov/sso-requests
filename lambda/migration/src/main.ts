import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import query from './query';

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  try {
    await query();
    const response = {
      statusCode: 200,
      headers: { time: new Date() },
      body: { success: true },
    };
    callback(null, response);
  } catch (err) {
    const response = {
      statusCode: 422,
      headers: { time: new Date() },
      body: { success: false },
    };
    callback(err, response);
  }
};

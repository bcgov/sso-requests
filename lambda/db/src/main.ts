import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { migrator } from './umzug';

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  const { headers } = event;

  try {
    await migrator.up();

    const response = {
      statusCode: 200,
      headers: { time: new Date() },
      body: { success: true },
    };

    callback(null, response);
  } catch (err) {
    console.error('errored out', err);

    const response = {
      statusCode: 422,
      headers: { time: new Date() },
      body: { success: false },
    };

    callback(err, response);
  }
};

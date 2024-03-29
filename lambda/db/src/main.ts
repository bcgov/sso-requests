import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { createMigrator } from './umzug';

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  const logs = [];
  const logger = {
    info: (...data) => {
      logs.push(JSON.stringify(data, null, 2));
    },
  };

  try {
    const migrator = await createMigrator(logger);
    await migrator.up();

    const response = {
      statusCode: 200,
      headers: { time: new Date() },
      body: { success: true, logs },
    };

    callback(null, response);
  } catch (err) {
    console.log('errored out', err);

    const response = {
      statusCode: 422,
      headers: { time: new Date() },
      body: { success: false },
    };

    callback(err, response);
  }
};

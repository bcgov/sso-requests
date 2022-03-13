import * as pg from 'pg';
import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { createMigrator } from './umzug';

console.log(!!pg);

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
    console.error('errored out', err);

    const response = {
      statusCode: 422,
      headers: { time: new Date() },
      body: { success: false },
    };

    callback(err, response);
  }
};

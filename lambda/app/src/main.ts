import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { authenticate } from './authenticate';
import getClient from './db';

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  const { headers } = event;
  const authenticated = await authenticate(headers);

  try {
    const client = await getClient();
    client.connect();
    await client.query('SELECT NOW()', (err, res) => {
      if (err) throw err;
      console.log('successful', res);
      client.end();
    });
  } catch (e) {
    console.log('errored out', e);
  }

  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': 'https://bcgov.github.io',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: `${authenticated ? 'Valid credentials' : 'Not valid'}`,
  };
  callback(null, response);
};

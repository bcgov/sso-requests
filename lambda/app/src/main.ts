import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
const Api = require('lambda-api-router');
import { setRoutes } from './routes';

const app = new Api();

setRoutes(app);

export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  return app.listen(event, context);
};

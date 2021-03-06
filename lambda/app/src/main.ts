import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
const Api = require('lambda-api-router');
import { setRoutes } from './routes';
import { expressyApiRouter } from '@lambda-shared/helpers/expressy-api-router';

const app = new Api();
expressyApiRouter(app);
setRoutes(app);

export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  return app.listen(event, context);
};

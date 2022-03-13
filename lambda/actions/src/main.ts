import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
const Api = require('lambda-api-router');
import { setRoutes } from './routes';
import { expressyApiRouter } from '@lambda-shared/helpers/expressy-api-router';

const app = new Api();
expressyApiRouter(app);
setRoutes(app);

export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  // Sequelize waits ~10seconds to drop connection, delaying API response.
  // Use this to prevent, see https://forum.serverless.com/t/lambda-with-rds-using-vpc-works-slow/1261/7 for more
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  return app.listen(event, context);
};

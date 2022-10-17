import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
const Api = require('lambda-api-router');
import { setRoutes } from './routes';
import { sequelize } from '@lambda-shared/sequelize/models/models';
import { expressyApiRouter } from '@lambda-shared/helpers/expressy-api-router';

const app = new Api();
expressyApiRouter(app);
setRoutes(app);

export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  console.log('Event: ', event);
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.log('Unable to connect to the database:', error);
  }

  return app.listen(event, context);
};

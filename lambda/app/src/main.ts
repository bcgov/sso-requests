import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import serverless from 'serverless-http';
import express from 'express';
import { setRoutes } from './routes';

const app = express();
setRoutes(app);

const apiHandler = serverless(app);
export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  console.log('Event: ', event);
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  const result = await apiHandler(event, context);
  return result;
};

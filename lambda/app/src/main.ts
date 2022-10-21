import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import serverless from 'serverless-http';
import express from 'express';
import { setRoutes } from './routes';

const tryJSON = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

const app = express();
app.use((req, res, next) => {
  req.body = req.body.toString();
  req.body = tryJSON(req.body);
  next();
});
setRoutes(app);

const apiHandler = serverless(app);
export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  console.log('Event: ', event);
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  const result = await apiHandler(event, context);
  return result as any;
};

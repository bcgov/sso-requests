import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import serverless from 'serverless-http';
import express from 'express';
import toLower from 'lodash.tolower';
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
app.set('etag', false);
setRoutes(app);

const apiHandler = serverless(app);
export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  console.log('Event: ', event);
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  const result: any = await apiHandler(event, context);

  [
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Credentials',
    'Accept',
    'Location',
    'Content-Type',
    'Content-Length',
  ].forEach((headerKey) => {
    // copy the target header values again in terms of the known issues of api gateway
    // see https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-known-issues.html
    // > `in API Gateway, header names and query parameters are processed in a case-sensitive way.`
    const headerValue = result.headers[toLower(headerKey)];
    if (headerValue) {
      result.headers[headerKey] = headerValue;
      delete result.headers[toLower(headerKey)];
    }
  });

  delete result.headers['x-powered-by'];
  console.log('Result: ', result);
  return result as any;
};

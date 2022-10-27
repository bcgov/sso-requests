import 'reflect-metadata';
import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { setRoutes } from './routes';

const tryJSON = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

const app = express();
const router = express.Router();
app.set('etag', false);
app.disable('x-powered-by');

router.use((req, res, next) => {
  req.body = req.body.toString();
  req.body = tryJSON(req.body);
  next();
});

router.use(
  cors({
    origin: '*',
    methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

setRoutes(router);

app.use('/api/v1', router);

const apiHandler = serverless(app);
export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false;
  const result: any = await apiHandler(event, context);
  return result as any;
};

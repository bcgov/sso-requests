import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { setRoutes } from './routes';
import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';

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
    origin: process.env.LOCAL_DEV === 'true' ? '*' : 'https://bcgov.github.io',
    methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

setRoutes(router);

app.use('/actions', router);

const apiHandler = serverless(app);
export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  console.log('Event: ', event);
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  const result: any = await apiHandler(event, context);

  console.log('Result: ', result);
  return result as any;
};

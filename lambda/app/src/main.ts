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

router.use((req, res, next) => {
  req.body = req.body.toString();
  req.body = tryJSON(req.body);
  next();
});

const allowedOrigin = process.env.LOCAL_DEV === 'true' ? '*' : 'https://bcgov.github.io';

router.use(
  cors({
    origin: allowedOrigin,
    methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

setRoutes(router);

app.use('/app', router);

const apiHandler = serverless(app);
export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  console.log('Event: ', event);
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  const result: any = await apiHandler(event, context);

  delete result.headers['x-powered-by'];
  console.log('Result: ', result);
  return result as any;
};

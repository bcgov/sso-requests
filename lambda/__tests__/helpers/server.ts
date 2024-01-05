import 'reflect-metadata';
import express from 'express';
import * as appRoutes from '../../app/src/routes';
import * as apiRoutes from '../../css-api/src/routes';
import bodyParser from 'body-parser';
import cors from 'cors';

const tryJSON = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

const app = express();
app.use(bodyParser.json());
const appRouter = express.Router();
const apiRouter = express.Router();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('etag', false);
app.disable('x-powered-by');

app.use(
  cors({
    origin: '*',
    methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

appRoutes.setRoutes(appRouter);
apiRoutes.setRoutes(apiRouter);
app.use('/api/v1', apiRouter);
app.use('/app', appRouter);

app.use(express.json());

export default app;

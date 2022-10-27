import 'reflect-metadata';
import express from 'express';
import { setRoutes } from '../../css-api/src/routes';
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
const router = express.Router();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('etag', false);
app.disable('x-powered-by');

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

app.use(express.json());

export default app;

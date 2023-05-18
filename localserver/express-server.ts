import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { setRoutes } from '../lambda/app/src/routes';
import * as actionRoutes from '../lambda/actions/src/routes';
import * as apiRoutes from '../lambda/css-api/src/routes';
import cors from 'cors';

const logger = morgan('combined');

interface Props {
  databaseUrl?: string;
}

const initExpresss = async () => {
  const expressServer = express();
  const appRouter = express.Router();
  const actionsRouter = express.Router();
  const apiRouter = express.Router();

  expressServer.use(
    cors({
      origin: process.env.APP_URL,
      methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }),
  );
  expressServer.use(logger);
  expressServer.use(bodyParser.json());
  expressServer.use(bodyParser.urlencoded({ extended: false }));
  expressServer.use(cookieParser());

  expressServer.disable('x-powered-by');

  setRoutes(appRouter);
  actionRoutes.setRoutes(actionsRouter);
  apiRoutes.setRoutes(apiRouter);
  expressServer.use('/app', appRouter);
  expressServer.use('/actions', actionsRouter);
  expressServer.use('/api/v1', apiRouter);
  return expressServer;
};

export default initExpresss;

declare global {
  namespace Express {
    interface Request {
      _permissions?: any;
    }
  }

  interface Error {
    status?: number;
  }
}

import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { setRoutes } from '../lambda/app/src/routes';
import * as apiRoutes from '../lambda/css-api/src/routes';
import cors from 'cors';

const logger = morgan('combined');

interface Props {
  databaseUrl?: string;
}

const initExpresss = async () => {
  const expressServer = express();
  const appRouter = express.Router();
  const apiRouter = express.Router();

  expressServer.use(logger);
  expressServer.use(bodyParser.json());
  expressServer.use(bodyParser.urlencoded({ extended: false }));
  expressServer.use(cookieParser());
  expressServer.use(cors({ origin: 'http://localhost:3000', credentials: true }));

  expressServer.disable('x-powered-by');
  expressServer.set('trust proxy', 1);

  setRoutes(appRouter);
  apiRoutes.setRoutes(apiRouter);
  expressServer.use('/app', appRouter);
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

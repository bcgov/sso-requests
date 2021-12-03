import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import _ from 'lodash';
import { setRoutes } from '../lambda/app/src/routes';

const logger = morgan('combined');

interface Props {
  databaseUrl?: string;
}

const initExpresss = async () => {
  const expressServer = express();
  const router = express.Router();

  expressServer.use(logger);
  expressServer.use(bodyParser.json());
  expressServer.use(bodyParser.urlencoded({ extended: false }));
  expressServer.use(cookieParser());

  expressServer.disable('x-powered-by');
  expressServer.set('trust proxy', 1);

  setRoutes(router);
  expressServer.use('/', router);
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

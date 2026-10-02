import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from '@/logger';
import { errorLogging, requestLogging } from '@/middleware/request-logging';
import router from '@/routes';
import dotenv from 'dotenv';
import { swaggerOptions } from '@/modules/swagger';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

app.use(requestLogging);
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '50mb',
  }),
);
app.use(helmet());

const swaggerDocs = swaggerJsDoc(swaggerOptions);

app.use('/openapi/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(`/api/${process.env.API_VERSION}`, router);

app.use(errorLogging);

app.listen('8080', () => {
  logger.info({ url: process.env.API_URL }, 'Server is running');
});

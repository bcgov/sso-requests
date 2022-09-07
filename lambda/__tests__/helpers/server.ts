import 'reflect-metadata';
import express from 'express';
import { setRoutes } from '../../css-api/src/routes';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());
const router = express.Router();
setRoutes(router);

app.use('/', router);

app.use(express.json());

export default app;

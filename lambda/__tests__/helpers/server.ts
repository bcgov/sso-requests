import 'reflect-metadata';
import express from 'express';
import { setRoutes } from '../../css-api/src/routes';

const app = express();
const router = express.Router();
setRoutes(router);

app.use('/', router);

app.use(express.json());

export default app;

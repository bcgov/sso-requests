import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import apiRouter from '@/routes';
import { requestLogging } from '@/middleware/request-logging';
import { recordAuditCoverage } from '@/tests/helpers/audit-coverage';

const app = express();
app.use(bodyParser.json());
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

// As in server.ts: every request gets a reqId and an audit context before any route.
app.use(requestLogging);

// Record which audit actions each request wrote before the response completes, so the test cannot move on
// (and wipe the table) first. See helpers/audit-coverage.ts.
app.use((req, res, next) => {
  const end = res.end.bind(res);
  (res as any).end = (...args: any[]) => {
    // Headers go out now, as they would have, so anything checking `res.headersSent` behaves the same.
    if (!res.headersSent) res.flushHeaders();
    const route = `${req.method} ${req.route?.path ?? req.path}`;
    recordAuditCoverage(route, res.statusCode, res.getHeader('x-request-id'))
      .catch((err) => console.error('audit coverage record failed', err))
      .finally(() => end(...args));
    return res;
  };
  next();
});
app.use('/api/v1', apiRouter);

app.use(express.json());

export default app;

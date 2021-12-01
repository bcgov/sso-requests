import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import Api from 'lambda-api-router';
import { authenticate } from './authenticate';
import { getEvents } from './routes/events';
import { createRequest, getRequests, getRequestAll, getRequest, updateRequest, deleteRequest } from './routes/requests';
import { getClient } from './routes/client';
import { getInstallation, changeSecret } from './routes/installation';
import { wakeUpAll } from './routes/heartbeat';
import { Session } from '../../shared/interfaces';

const app = new Api();

const allowedOrigin = process.env.LOCAL_DEV === 'true' ? 'http://localhost:3000' : 'https://bcgov.github.io';

const responseHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT, DELETE',
  'Access-Control-Allow-Credentials': 'true',
};

const BASE_PATH = '/app';

app.options('*', async (req, res) => {
  res.json(null);
});

app.use((req, res) => {
  res.headers(responseHeaders);
});

app.use(async (req, res) => {
  const session = await authenticate(req.headers);
  if (!session) {
    res.status(401).json({ success: false });
  }
});

app.any(`${BASE_PATH}/heartbeat`, async (req, res) => {
  try {
    const result = await wakeUpAll();
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false });
  }
});

app.post(`${BASE_PATH}/requests-all`, async (req, res) => {
  try {
    const session = await authenticate(req.headers);
    const result = await getRequestAll(session as Session, req.body);
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false, message: err.message || err });
  }
});

app.get(`${BASE_PATH}/requests`, async (req, res) => {
  try {
    const session = await authenticate(req.headers);
    const { include } = req.query;
    const result = await getRequests(session as Session, include);
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false, message: err.message || err });
  }
});

app.post(`${BASE_PATH}/requests`, async (req, res) => {
  try {
    const session = await authenticate(req.headers);
    const result = await createRequest(session as Session, req.body);
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false, message: err.message || err });
  }
});

app.put(`${BASE_PATH}/requests`, async (req, res) => {
  try {
    const session = await authenticate(req.headers);
    const { submit } = req.query;
    const result = await updateRequest(session as Session, req.body, submit);
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false, message: err.message || err });
  }
});

app.delete(`${BASE_PATH}/requests`, async (req, res) => {
  try {
    const session = await authenticate(req.headers);
    const { id } = req.query;
    const result = await deleteRequest(session as Session, Number(id));
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false, message: err.message || err });
  }
});

app.post(`${BASE_PATH}/request`, async (req, res) => {
  try {
    const session = await authenticate(req.headers);
    const result = await getRequest(session as Session, req.body);
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false, message: err.message || err });
  }
});

app.post(`${BASE_PATH}/installation`, async (req, res) => {
  try {
    const session = await authenticate(req.headers);
    const result = await getInstallation(session as Session, req.body);
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false, message: err.message || err });
  }
});

app.put(`${BASE_PATH}/installation`, async (req, res) => {
  try {
    const session = await authenticate(req.headers);
    const result = await changeSecret(session as Session, req.body);
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false, message: err.message || err });
  }
});

app.post(`${BASE_PATH}/client`, async (req, res) => {
  try {
    const session = await authenticate(req.headers);
    const result = await getClient(session as Session, req.body);
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false, message: err.message || err });
  }
});

app.post(`${BASE_PATH}/events`, async (req, res) => {
  try {
    const session = await authenticate(req.headers);
    const result = await getEvents(session as Session, req.body);
    res.json(result);
  } catch (err) {
    res.status(422).json({ success: false, message: err.message || err });
  }
});

export const handler = async (event: APIGatewayProxyEvent, context?: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  return app.listen(event, context);
};

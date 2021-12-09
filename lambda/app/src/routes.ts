import { isFunction } from 'lodash';
import { authenticate } from './authenticate';
import { getEvents } from './controllers/events';
import { listTeams, createTeam, updateTeam, deleteTeam } from './controllers/team';
import { findOrCreateUser } from './controllers/user';
import {
  createRequest,
  getRequests,
  getRequestAll,
  getRequest,
  updateRequest,
  deleteRequest,
} from './controllers/requests';
import { getClient } from './controllers/client';
import { getInstallation, changeSecret } from './controllers/installation';
import { wakeUpAll } from './controllers/heartbeat';
import { Session } from '../../shared/interfaces';

const allowedOrigin = process.env.LOCAL_DEV === 'true' ? 'http://localhost:3000' : 'https://bcgov.github.io';

const responseHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
  'Access-Control-Allow-Credentials': 'true',
};

const BASE_PATH = '/app';

export const setRoutes = (app: any) => {
  app.use((req, res, next) => {
    try {
      req.body = JSON.parse(req.body);
    } catch {}

    if (isFunction(res.headers)) res.headers(responseHeaders);
    else res.set(responseHeaders);

    if (next) next();
  });

  app.options('(.*)', async (req, res) => {
    res.status(200).json(null);
  });

  app.get(`${BASE_PATH}/heartbeat`, async (req, res) => {
    try {
      const result = await wakeUpAll();
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.use(async (req, res, next) => {
    const session = await authenticate(req.headers);
    if (!session) {
      return res.status(401).json({ success: false });
    }

    try {
      req.user = await findOrCreateUser(session);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }

    if (next) next();
  });

  app.get(`${BASE_PATH}/me`, async (req, res) => {
    try {
      res.status(200).json(req.user);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/requests-all`, async (req, res) => {
    try {
      const session = await authenticate(req.headers);
      if (!session) return res.status(401).json({ success: false, message: 'not authorized' });

      const result = await getRequestAll(session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.get(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const session = await authenticate(req.headers);
      if (!session) return res.status(401).json({ success: false, message: 'not authorized' });

      const { include } = req.query;
      const result = await getRequests(session as Session, include);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const session = await authenticate(req.headers);
      if (!session) return res.status(401).json({ success: false, message: 'not authorized' });

      const result = await createRequest(session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.put(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const session = await authenticate(req.headers);
      if (!session) return res.status(401).json({ success: false, message: 'not authorized' });

      const { submit } = req.query;
      const result = await updateRequest(session as Session, req.body, submit);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.delete(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const session = await authenticate(req.headers);
      if (!session) return res.status(401).json({ success: false, message: 'not authorized' });

      const { id } = req.query;
      const result = await deleteRequest(session as Session, Number(id));
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/request`, async (req, res) => {
    try {
      const session = await authenticate(req.headers);
      if (!session) return res.status(401).json({ success: false, message: 'not authorized' });

      const result = await getRequest(session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/installation`, async (req, res) => {
    try {
      const session = await authenticate(req.headers);
      if (!session) return res.status(401).json({ success: false, message: 'not authorized' });

      const result = await getInstallation(session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.put(`${BASE_PATH}/installation`, async (req, res) => {
    try {
      const session = await authenticate(req.headers);
      if (!session) return res.status(401).json({ success: false, message: 'not authorized' });

      const result = await changeSecret(session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/client`, async (req, res) => {
    try {
      const session = await authenticate(req.headers);
      if (!session) return res.status(401).json({ success: false, message: 'not authorized' });

      const result = await getClient(session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/events`, async (req, res) => {
    try {
      const session = await authenticate(req.headers);
      if (!session) return res.status(401).json({ success: false, message: 'not authorized' });

      const result = await getEvents(session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.get(`${BASE_PATH}/teams`, async (req, res) => {
    try {
      const result = await listTeams(req.user);
      res.status(200).json(result);
    } catch (err) {
      console.log(err);
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/teams`, async (req, res) => {
    try {
      const result = await createTeam(req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      console.log(err);
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.put(`${BASE_PATH}/teams/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await updateTeam(req.user, id, req.body);
      res.status(200).json(result);
    } catch (err) {
      console.log(err);
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.delete(`${BASE_PATH}/teams/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteTeam(req.user, id);
      res.status(200).json(result);
    } catch (err) {
      console.log(err);
      res.status(422).json({ success: false, message: err.message || err });
    }
  });
};

import { isFunction } from 'lodash';
import { authenticate } from './authenticate';
import { getEvents } from './controllers/events';
import {
  listTeams,
  createTeam,
  addUsersToTeam,
  deleteTeam,
  verifyTeamMember,
  getUsersOnTeam,
  updateTeam,
  userIsTeamAdmin,
  userCanReadTeam,
  removeUserFromTeam,
} from './controllers/team';
import { findOrCreateUser } from './controllers/user';
import {
  createRequest,
  getRequests,
  getRequestAll,
  getRequest,
  updateRequest,
  deleteRequest,
  updateRequestMetadata,
} from './controllers/requests';
import { getClient } from './controllers/client';
import { getInstallation, changeSecret } from './controllers/installation';
import { wakeUpAll } from './controllers/heartbeat';
import { Session } from '../../shared/interfaces';
import { parseInvitationToken, inviteTeamMembers } from '../src/utils/helpers';
import encodeurl = require('encodeurl');

const APP_URL = process.env.APP_URL || '';
const allowedOrigin = process.env.LOCAL_DEV === 'true' ? 'http://localhost:3000' : 'https://bcgov.github.io';

const responseHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
  'Access-Control-Allow-Credentials': 'true',
};

const BASE_PATH = '/app';

const handleError = (res, err) => {
  console.error(err);
  res.status(422).json({ success: false, message: err.message || err });
};

export const setRoutes = (app: any) => {
  app.use((req, res, next) => {
    res.set(responseHeaders);
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
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/teams/verify`, async (req, res) => {
    try {
      const token = req.query.token;
      if (!req.query.token) return res.redirect(`${APP_URL}/verify-user?message=no-token`);
      else {
        const [data] = await parseInvitationToken(token);
        const { userId, teamId, exp } = data;
        // exp returns seconds not milliseconds
        const expired = new Date(exp * 1000).getTime() - new Date().getTime() < 0;
        if (expired) return res.redirect(`${APP_URL}/verify-user?message=${encodeurl('This link has expired')}`);
        const verified = await verifyTeamMember(userId, teamId);
        if (!verified) return res.redirect(`${APP_URL}/verify-user?message=${encodeurl('User not found')}`);
        return res.redirect(`${APP_URL}/verify-user?message=success&teamId=${teamId}`);
      }
    } catch (err) {
      handleError(res, err);
    }
  });

  app.use(async (req, res, next) => {
    const session = (await authenticate(req.headers)) as Session;
    if (!session) {
      res.status(401).json({ success: false, message: 'not authorized' });
      return false;
    }

    try {
      const user = await findOrCreateUser(session);
      session.user = user;
      req.user = user;
      req.session = session;
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
      const result = await getRequestAll(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.get(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const { include } = req.query || {};
      const result = await getRequests(req.session as Session, req.user, include);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const result = await createRequest(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.put(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const { submit } = req.query || {};
      const result = await updateRequest(req.session as Session, req.body, req.user, submit);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.delete(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const { id } = req.query || {};
      const result = await deleteRequest(req.session as Session, req.user, Number(id));
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/request`, async (req, res) => {
    try {
      const result = await getRequest(req.session as Session, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.put(`${BASE_PATH}/request-metadata`, async (req, res) => {
    try {
      const result = await updateRequestMetadata(req.session as Session, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/installation`, async (req, res) => {
    try {
      const result = await getInstallation(req.session as Session, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.put(`${BASE_PATH}/installation`, async (req, res) => {
    try {
      const result = await changeSecret(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/client`, async (req, res) => {
    try {
      const result = await getClient(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.post(`${BASE_PATH}/events`, async (req, res) => {
    try {
      const result = await getEvents(req.session as Session, req.body);
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
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/teams`, async (req, res) => {
    try {
      const result = await createTeam(req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/teams/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const authorized = await userIsTeamAdmin(req.user, id);
      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to edit this team' });
      const result = await updateTeam(req.user, id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/teams/:id/members`, async (req, res) => {
    try {
      const { id } = req.params;
      const authorized = await userIsTeamAdmin(req.user, id);
      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to edit this team' });
      const result = await addUsersToTeam(id, req.body);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.delete(`${BASE_PATH}/teams/:id/members/:memberId`, async (req, res) => {
    try {
      const { id, memberId } = req.params;
      const authorized = await userIsTeamAdmin(req.user, id);
      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to edit this team' });
      const result = await removeUserFromTeam(memberId, id);
      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({ success: false, message: err.message || err });
    }
  });

  app.get(`${BASE_PATH}/teams/:id/members`, async (req, res) => {
    try {
      const { id } = req.params;
      const authorized = await userCanReadTeam(req.user, id);
      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to read this team' });
      const result = await getUsersOnTeam(id);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/teams/:id/invite`, async (req, res) => {
    try {
      const { id } = req.params;
      const authorized = await userIsTeamAdmin(req.user, id);
      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to read this team' });
      await inviteTeamMembers([req.body], id);
      res.status(200).send();
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`${BASE_PATH}/teams/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const authorized = await userIsTeamAdmin(req.user, id);
      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to delete this team' });
      const result = await deleteTeam(req.user, id);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });
};

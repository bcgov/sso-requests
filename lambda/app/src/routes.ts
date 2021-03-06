import { isString } from 'lodash';
import { authenticate } from './authenticate';
import { getEvents } from './controllers/events';
import {
  listTeams,
  createTeam,
  addUsersToTeam,
  deleteTeam,
  verifyTeamMember,
  updateTeam,
  userIsTeamAdmin,
  removeUserFromTeam,
  updateMemberInTeam,
  getServiceAccount,
  requestServiceAccount,
  downloadServiceAccount,
} from './controllers/team';
import { findOrCreateUser, updateProfile } from './controllers/user';
import {
  createRequest,
  getRequests,
  getRequestAll,
  getRequest,
  updateRequest,
  deleteRequest,
  updateRequestMetadata,
} from './controllers/requests';
import { listIntegrationsForTeam } from './queries/request';
import { getClient } from './controllers/client';
import { getInstallation, changeSecret } from './controllers/installation';
import { searchKeycloakUsers } from './controllers/keycloak';
import { wakeUpAll } from './controllers/heartbeat';
import {
  listClientRoles,
  listUserRoles,
  manageUserRole,
  manageUserRoles,
  listRoleUsers,
  createRole,
  bulkCreateRole,
  deleteRole,
  findClientRole,
  getCompositeClientRoles,
  setCompositeClientRoles,
} from './keycloak/users';
import { searchIdirUsers, importIdirUser } from './bceid-webservice-proxy/idir';
import { findAllowedTeamUsers } from './queries/team';
import { Session, User } from '../../shared/interfaces';
import { inviteTeamMembers } from '../src/utils/helpers';
import { getAllowedTeams } from '@lambda-app/queries/team';
import { parseInvitationToken } from '@lambda-app/helpers/token';
import { findMyOrTeamIntegrationsByService } from '@lambda-app/queries/request';
import { isAdmin } from './utils/helpers';

const APP_URL = process.env.APP_URL || '';
const allowedOrigin = process.env.LOCAL_DEV === 'true' ? 'http://localhost:3000' : 'https://bcgov.github.io';

const responseHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
  'Access-Control-Allow-Credentials': 'true',
};

const BASE_PATH = '/app';

const tryJSON = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

const handleError = (res, err) => {
  let message = err.message || err;
  if (isString(message)) {
    message = tryJSON(message);
  }

  res.status(422).json({ success: false, message });
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

  app.get(`${BASE_PATH}/verify-token`, async (req, res) => {
    try {
      const session = (await authenticate(req.headers)) as Session;
      res.status(200).json(session);
      return session;
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/teams/verify`, async (req, res) => {
    try {
      const token = req.query.token;
      if (!token) return res.redirect(`${APP_URL}/verify-user?message=notoken`);
      else {
        const { error, message, userId, teamId } = parseInvitationToken(token);

        if (error) return res.redirect(`${APP_URL}/verify-user?message=${message}`);

        const verified = await verifyTeamMember(userId, teamId);
        if (!verified) return res.redirect(`${APP_URL}/verify-user?message=notfound`);

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
      const user: User = await findOrCreateUser(session);
      user.isAdmin = isAdmin(session);
      session.user = user;
      req.user = user;
      req.session = session;
    } catch (err) {
      handleError(res, err);
    }

    if (next) next();
  });

  app.get(`${BASE_PATH}/me`, async (req, res) => {
    try {
      const integrations = await findMyOrTeamIntegrationsByService(req.user.id);
      res.status(200).json({ ...req.user, integrations });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/me`, async (req, res) => {
    try {
      const result = await updateProfile(req.session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/requests-all`, async (req, res) => {
    try {
      const result = await getRequestAll(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const { include } = req.query || {};
      const result = await getRequests(req.session as Session, req.user, include);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/team-integrations/:teamId`, async (req, res) => {
    try {
      const { teamId } = req.params;
      const result = await listIntegrationsForTeam(req.session as Session, teamId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const result = await createRequest(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const { submit } = req.query || {};
      const result = await updateRequest(req.session as Session, req.body, req.user, submit);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`${BASE_PATH}/requests`, async (req, res) => {
    try {
      const { id } = req.query || {};
      const result = await deleteRequest(req.session as Session, req.user, Number(id));
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/request`, async (req, res) => {
    try {
      const result = await getRequest(req.session as Session, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/request-metadata`, async (req, res) => {
    try {
      const result = await updateRequestMetadata(req.session as Session, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/installation`, async (req, res) => {
    try {
      const result = await getInstallation(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/installation`, async (req, res) => {
    try {
      const result = await changeSecret(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/keycloak/users`, async (req, res) => {
    try {
      const result = await searchKeycloakUsers(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/keycloak/roles`, async (req, res) => {
    try {
      const result = await listClientRoles((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/keycloak/user-roles`, async (req, res) => {
    try {
      const result = await listUserRoles((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/keycloak/user-role`, async (req, res) => {
    try {
      const result = await manageUserRole((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/keycloak/user-roles`, async (req, res) => {
    try {
      const result = await manageUserRoles((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/keycloak/role-users`, async (req, res) => {
    try {
      const result = await listRoleUsers((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/keycloak/set-composite-roles`, async (req, res) => {
    try {
      const result = await setCompositeClientRoles((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/keycloak/get-composite-roles`, async (req, res) => {
    try {
      const result = await getCompositeClientRoles((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/keycloak/roles`, async (req, res) => {
    try {
      const result = await createRole((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/keycloak/role`, async (req, res) => {
    try {
      const result = await findClientRole((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/keycloak/bulk-roles`, async (req, res) => {
    try {
      const result = await bulkCreateRole((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/keycloak/delete-role`, async (req, res) => {
    try {
      const result = await deleteRole((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/bceid-webservice/idir/search`, async (req, res) => {
    try {
      const result = await searchIdirUsers((req.session as Session).bearerToken, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`${BASE_PATH}/bceid-webservice/idir/import`, async (req, res) => {
    try {
      const result = await importIdirUser((req.session as Session).bearerToken, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  // app.post(`${BASE_PATH}/client`, async (req, res) => {
  //   try {
  //     const result = await getClient(req.session as Session, req.body);
  //     res.status(200).json(result);
  //   } catch (err) {
  //     handleError(res, err);
  //   }
  // });

  app.post(`${BASE_PATH}/events`, async (req, res) => {
    try {
      const result = await getEvents(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
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

  app.get(`${BASE_PATH}/allowed-teams`, async (req, res) => {
    try {
      const result = await getAllowedTeams(req.user, { raw: true });
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
      const result = await addUsersToTeam(id, req.user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/teams/:id/members/:memberId`, async (req, res) => {
    try {
      const { id, memberId } = req.params;
      const authorized = await userIsTeamAdmin(req.user, id);
      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to edit this team' });

      const result = await updateMemberInTeam(id, memberId, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
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
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/teams/:id/members`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await findAllowedTeamUsers(id, req.user.id);
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

  app.post(`${BASE_PATH}/teams/:id/service-accounts`, async (req, res) => {
    try {
      const { id: teamId } = req.params;
      const result = await requestServiceAccount(req.user.id, teamId, req.user.displayName);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/teams/:id/service-account`, async (req, res) => {
    try {
      const { id: teamId } = req.params;
      const result = await getServiceAccount(req.user.id, teamId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/teams/:id/service-account/:saId`, async (req, res) => {
    try {
      const { id: teamId, saId } = req.params;
      const result = await downloadServiceAccount(req.user.id, teamId, saId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });
};

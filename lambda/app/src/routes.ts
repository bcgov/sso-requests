import isString from 'lodash.isstring';
import { authenticate } from './authenticate';
import { getEvents } from './controllers/events';
import {
  listTeams,
  createTeam,
  addUsersToTeam,
  deleteTeam,
  verifyTeamMember,
  updateTeam,
  removeUserFromTeam,
  updateMemberInTeam,
  getServiceAccount,
  requestServiceAccount,
  deleteServiceAccount,
  getServiceAccounts,
  getServiceAccountCredentials,
  updateServiceAccountSecret,
  restoreTeamServiceAccount,
} from './controllers/team';
import {
  deleteStaleUsers,
  findOrCreateUser,
  isAllowedToManageRoles,
  listClientRolesByUsers,
  listUsersByRole,
  updateProfile,
  updateUserRoleMapping,
  updateUserRoleMappings,
  createSurvey,
} from './controllers/user';
import {
  createRequest,
  getRequests,
  getRequestAll,
  getRequest,
  updateRequest,
  resubmitRequest,
  deleteRequest,
  updateRequestMetadata,
  getIntegrations,
  isAllowedToDeleteIntegration,
  restoreRequest,
} from './controllers/requests';
import { getInstallation, changeSecret } from './controllers/installation';
import { searchKeycloakUsers } from './controllers/keycloak';
import { wakeUpAll } from './controllers/heartbeat';
import { searchIdirUsers, importIdirUser, searchIdirEmail } from './ms-graph/idir';
import { findAllowedTeamUsers } from './queries/team';
import { Session, User } from '../../shared/interfaces';
import { inviteTeamMembers } from '../src/utils/helpers';
import { getAllowedTeam, getAllowedTeams } from '@lambda-app/queries/team';
import { parseInvitationToken } from '@lambda-app/helpers/token';
import { findMyOrTeamIntegrationsByService } from '@lambda-app/queries/request';
import { isAdmin } from './utils/helpers';
import {
  createClientRole,
  deleteRoles,
  listRoles,
  getClientRole,
  bulkCreateClientRoles,
  setCompositeRoles,
  listCompositeRoles,
} from './controllers/roles';
import {
  getAllStandardIntegrations,
  getDatabaseTable,
  getBceidApprovedRequestsAndEvents,
  getDataIntegrityReport,
} from './controllers/reports';
import { assertSessionRole } from './helpers/permissions';
import { fetchDiscussions } from './graphql';
import { sendTemplate } from '@lambda-shared/templates';
import { EMAILS } from '@lambda-shared/enums';
import { fetchLogs, fetchMetrics } from '@lambda-app/controllers/logs';
import { getPrivacyZones, getAttributes } from './controllers/bc-services-card';
import createHttpError from 'http-errors';

const APP_URL = process.env.APP_URL || '';

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
  console.log({ success: false, message });
  res.status(err.status || 422).json({ success: false, message });
};

export const setRoutes = (app: any) => {
  app.options(`/*`, async (req, res) => {
    res.status(200).json(null);
  });

  app.get(`/heartbeat`, async (req, res) => {
    try {
      const result = await wakeUpAll();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/github/discussions`, async (req, res) => {
    try {
      const result = await fetchDiscussions();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/verify-token`, async (req, res) => {
    try {
      const session = (await authenticate(req.headers)) as Session;
      res.status(200).json(session);
      return session;
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/teams/verify`, async (req, res) => {
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

  app.post(`/delete-inactive-idir-users`, async (req, res) => {
    try {
      const { Authorization, authorization } = req.headers || {};
      const authHeader = Authorization || authorization;
      if (!authHeader || authHeader !== process.env.API_AUTH_SECRET) {
        res.status(401).json({ success: false, message: 'not authorized' });
        return false;
      }
      const result = await deleteStaleUsers(req.body);
      if (result) res.status(200).json({ success: true });
      else res.status(404).json({ success: false, message: 'user not found' });
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
      return false;
    }

    if (next) next();
  });

  app.get(`/me`, async (req, res) => {
    try {
      const integrations = await findMyOrTeamIntegrationsByService(req.user.id);
      res.status(200).json({ ...req.user, integrations });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/me`, async (req, res) => {
    try {
      const result = await updateProfile(req.session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post('/surveys', async (req, res) => {
    try {
      const { rating, message, triggerEvent } = req.body;

      if (!rating || !triggerEvent) {
        return res.status(422).json({ message: 'Please include the keys "rating" and "triggerEvent" in the body.' });
      }

      // awaiting so email won't send if db save errors
      await createSurvey(req.session, req.body);
      await sendTemplate(EMAILS.SURVEY_COMPLETED, { user: req.session.user, rating, message, triggerEvent });

      res.status(200).send();
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/requests-all`, async (req, res) => {
    try {
      const result = await getRequestAll(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/requests`, async (req, res) => {
    try {
      const { include } = req.query || {};
      const result = await getRequests(req.session as Session, req.user, include);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/team-integrations/:teamId`, async (req, res) => {
    try {
      const { teamId } = req.params;
      const result = await getIntegrations(req.session as Session, teamId, req.user);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/requests`, async (req, res) => {
    try {
      const result = await createRequest(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`/requests`, async (req, res) => {
    try {
      const { submit } = req.query || {};
      const result = await updateRequest(req.session as Session, req.body, req.user, submit);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/requests/:id/resubmit`, async (req, res) => {
    try {
      const { id } = req.params || {};
      if (!id) {
        throw new createHttpError.NotFound('integration ID not found');
      }
      const result = await resubmitRequest(req.session as Session, Number(id));
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/requests/:id/restore`, async (req, res) => {
    try {
      assertSessionRole(req.session, 'sso-admin');
      const { id } = req.params || {};
      let { email } = req.body || {};
      if (typeof email === 'string') {
        email = email.toLowerCase();
      }
      if (!id) {
        throw new createHttpError.NotFound('integration ID not found');
      }
      const result = await restoreRequest(req.session as Session, Number(id), email);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/requests/:id/logs`, async (req, res) => {
    try {
      const { id } = req.params || {};
      const { start, end, env } = req.query || {};
      const { status, message, data } = await fetchLogs(req.session, env, id, start, end);
      if (status === 200) {
        res.setHeader('Content-Length', JSON.stringify(data).length);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment`);
        res.status(status).send(data);
      } else {
        res.status(status).send({ message });
      }
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/requests/:id/metrics`, async (req, res) => {
    try {
      const { id } = req.params || {};
      const { fromDate, toDate, env } = req.query || {};
      const { status, message, data } = await fetchMetrics(req.session, id, env, fromDate, toDate);
      if (status === 200) res.status(status).send(data);
      else res.status(status).send({ message });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`/requests`, async (req, res) => {
    try {
      const { id } = req.query || {};

      const authorized = await isAllowedToDeleteIntegration(req.session as Session, id);

      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to delete this integration' });

      const result = await deleteRequest(req.session as Session, req.user, Number(id));
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/request`, async (req, res) => {
    try {
      const result = await getRequest(req.session as Session, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`/request-metadata`, async (req, res) => {
    try {
      const result = await updateRequestMetadata(req.session as Session, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/installation`, async (req, res) => {
    try {
      const result = await getInstallation(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`/installation`, async (req, res) => {
    try {
      const result = await changeSecret(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/users`, async (req, res) => {
    try {
      const result = await searchKeycloakUsers(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/roles`, async (req, res) => {
    try {
      const result = await listRoles(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/user-roles`, async (req, res) => {
    try {
      const result = await listClientRolesByUsers((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`/keycloak/user-role`, async (req, res) => {
    try {
      const result = await updateUserRoleMapping((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`/keycloak/user-roles`, async (req, res) => {
    try {
      const result = await updateUserRoleMappings((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/role-users`, async (req, res) => {
    try {
      const result = await listUsersByRole(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/set-composite-roles`, async (req, res) => {
    try {
      const authorized = await isAllowedToManageRoles(req.session as Session, req.body.integrationId);

      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to update composite roles' });

      const result = await setCompositeRoles((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/get-composite-roles`, async (req, res) => {
    try {
      const result = await listCompositeRoles(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/roles`, async (req, res) => {
    try {
      const result = await createClientRole((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/role`, async (req, res) => {
    try {
      const result = await getClientRole((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/bulk-roles`, async (req, res) => {
    try {
      const authorized = await isAllowedToManageRoles(req.session as Session, req.body.integrationId);

      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to create role' });

      const result = await bulkCreateClientRoles((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/delete-role`, async (req, res) => {
    try {
      const authorized = await isAllowedToManageRoles(req.session as Session, req.body.integrationId);

      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to delete role' });

      const result = await deleteRoles((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/bceid-webservice/idir/search`, async (req, res) => {
    try {
      const result = await searchIdirUsers(req.body);
      if (!result) res.status(404).send();
      else res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/bceid-webservice/idir/import`, async (req, res) => {
    try {
      const result = await importIdirUser(req.body);
      if (!result) res.status(404).send();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get('/idir-users', async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        res.status(400).send('Must include email query parameter');
        return;
      }
      const result = await searchIdirEmail(email);
      res.status(200).send(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/events`, async (req, res) => {
    try {
      assertSessionRole(req.session, 'sso-admin');
      const result = await getEvents(req.session as Session, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/teams`, async (req, res) => {
    try {
      const result = await listTeams(req.user);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/allowed-teams`, async (req, res) => {
    try {
      const result = await getAllowedTeams(req.user, { raw: true });
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/allowed-teams/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await getAllowedTeam(id, req.user, { raw: true });
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/teams`, async (req, res) => {
    try {
      const result = await createTeam(req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`/teams/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await updateTeam(req.user, id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/teams/:id/members`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await addUsersToTeam(id, req.user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`/teams/:id/members/:memberId`, async (req, res) => {
    try {
      const { id, memberId } = req.params;
      const result = await updateMemberInTeam(req.user.id, id, memberId, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`/teams/:id/members/:memberId`, async (req, res) => {
    try {
      const { id, memberId } = req.params;
      const result = await removeUserFromTeam(req.user.id, memberId, id);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/teams/:id/members`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await findAllowedTeamUsers(id, req.user.id);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/teams/:id/invite`, async (req, res) => {
    try {
      const { id } = req.params;
      await inviteTeamMembers(req.user.id, [req.body], id);
      res.status(200).send();
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`/teams/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteTeam(req.session as Session, id);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/teams/:id/service-accounts`, async (req, res) => {
    try {
      const { id: teamId } = req.params;
      const result = await requestServiceAccount(req.session as Session, req.user.id, teamId, req.user.displayName);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/teams/:id/service-accounts`, async (req, res) => {
    try {
      const { id: teamId } = req.params;
      const result = await getServiceAccounts(req.user.id, teamId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/teams/:id/service-accounts/:saId`, async (req, res) => {
    try {
      const { id: teamId, saId } = req.params;
      const result = await getServiceAccount(req.user.id, teamId, saId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/teams/:id/service-accounts/:saId/restore`, async (req, res) => {
    try {
      const { id: teamId, saId } = req.params;
      assertSessionRole(req.session, 'sso-admin');
      const result = await restoreTeamServiceAccount(req.session as Session, req.user.id, teamId, saId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/teams/:id/service-accounts/:saId/credentials`, async (req, res) => {
    try {
      const { id: teamId, saId } = req.params;
      const result = await getServiceAccountCredentials(req.user.id, teamId, saId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`/teams/:id/service-accounts/:saId/credentials`, async (req, res) => {
    try {
      const { id: teamId, saId } = req.params;
      const result = await updateServiceAccountSecret(req.user.id, teamId, saId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`/teams/:id/service-accounts/:saId`, async (req, res) => {
    try {
      const { id: teamId, saId } = req.params;
      const result = await deleteServiceAccount(req.session as Session, req.user.id, teamId, saId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/reports/all-standard-integrations`, async (req, res) => {
    try {
      assertSessionRole(req.session, 'sso-admin');
      const result = await getAllStandardIntegrations();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/reports/database-tables`, async (req, res) => {
    try {
      assertSessionRole(req.session, 'sso-admin');
      const result = await getDatabaseTable(req.query.type, req.query.orderBy);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/reports/all-bceid-approved-requests-and-events`, async (req, res) => {
    try {
      assertSessionRole(req.session, 'sso-admin');
      const result = await getBceidApprovedRequestsAndEvents();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/reports/data-integrity`, async (req, res) => {
    try {
      assertSessionRole(req.session, 'sso-admin');
      const result = await getDataIntegrityReport();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get('/bc-services-card/privacy-zones', async (req, res) => {
    try {
      const result = await getPrivacyZones();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get('/bc-services-card/claim-types', async (req, res) => {
    try {
      const result = await getAttributes();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });
};

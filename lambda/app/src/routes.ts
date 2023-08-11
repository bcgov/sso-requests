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
  userIsTeamAdmin,
  removeUserFromTeam,
  updateMemberInTeam,
  getServiceAccount,
  requestServiceAccount,
  deleteServiceAccount,
  getServiceAccounts,
  getServiceAccountCredentials,
  updateServiceAccountSecret,
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
} from './controllers/requests';
import { getInstallation, changeSecret } from './controllers/installation';
import { searchKeycloakUsers } from './controllers/keycloak';
import { wakeUpAll } from './controllers/heartbeat';
import { bulkCreateRole, getCompositeClientRoles, setCompositeClientRoles } from './keycloak/users';
import { searchIdirUsers, importIdirUser } from './bceid-webservice-proxy/idir';
import { findAllowedTeamUsers } from './queries/team';
import { Session, User } from '../../shared/interfaces';
import { inviteTeamMembers } from '../src/utils/helpers';
import { getAllowedTeam, getAllowedTeams } from '@lambda-app/queries/team';
import { parseInvitationToken } from '@lambda-app/helpers/token';
import { findMyOrTeamIntegrationsByService } from '@lambda-app/queries/request';
import { isAdmin } from './utils/helpers';
import { createClientRole, deleteRoles, listRoles, getClientRole } from './controllers/roles';
import { getAllStandardIntegrations, getDatabaseTable, getBceidApprovedRequestsAndEvents } from './controllers/reports';
import { assertSessionRole } from './helpers/permissions';
import { fetchDiscussions } from './graphql';

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
        throw Error('integration ID not found');
      }
      const result = await resubmitRequest(req.session as Session, Number(id));
      res.status(200).json(result);
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
      const result = await listRoles((req.session as Session).user.id, req.body);
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
      const result = await listUsersByRole((req.session as Session).user.id, req.body);
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

      const result = await setCompositeClientRoles((req.session as Session).user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/keycloak/get-composite-roles`, async (req, res) => {
    try {
      const result = await getCompositeClientRoles((req.session as Session).user.id, req.body);
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

      const result = await bulkCreateRole((req.session as Session).user.id, req.body);
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
      const result = await searchIdirUsers((req.session as Session).bearerToken, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/bceid-webservice/idir/import`, async (req, res) => {
    try {
      const result = await importIdirUser((req.session as Session).bearerToken, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  // app.post(`/client`, async (req, res) => {
  //   try {
  //     const result = await getClient(req.session as Session, req.body);
  //     res.status(200).json(result);
  //   } catch (err) {
  //     handleError(res, err);
  //   }
  // });

  app.post(`/events`, async (req, res) => {
    try {
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
      const authorized = await userIsTeamAdmin(req.user, id);

      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to edit this team' });

      const result = await updateTeam(req.user, id, req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(`/teams/:id/members`, async (req, res) => {
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

  app.put(`/teams/:id/members/:memberId`, async (req, res) => {
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

  app.delete(`/teams/:id/members/:memberId`, async (req, res) => {
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
      const authorized = await userIsTeamAdmin(req.user, id);
      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to read this team' });
      await inviteTeamMembers([req.body], id);
      res.status(200).send();
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`/teams/:id`, async (req, res) => {
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

  app.post(`/teams/:id/service-accounts`, async (req, res) => {
    try {
      const { id: teamId } = req.params;
      const authorized = await userIsTeamAdmin(req.user, teamId);
      if (!authorized)
        return res.status(401).json({
          success: false,
          message: 'You are not authorized to create api account belonging to this team',
        });
      const result = await requestServiceAccount(req.session as Session, req.user.id, teamId, req.user.displayName);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/teams/:id/service-accounts`, async (req, res) => {
    try {
      const { id: teamId } = req.params;
      const authorized = await userIsTeamAdmin(req.user, teamId);
      if (!authorized)
        return res.status(401).json({
          success: false,
          message: 'You are not authorized to access api accounts belonging to this team',
        });
      const result = await getServiceAccounts(req.user.id, teamId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/teams/:id/service-accounts/:saId`, async (req, res) => {
    try {
      const { id: teamId, saId } = req.params;
      const authorized = await userIsTeamAdmin(req.user, teamId);
      if (!authorized)
        return res.status(401).json({
          success: false,
          message: 'You are not authorized to access api account belonging to this team',
        });
      const result = await getServiceAccount(req.user.id, teamId, saId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/teams/:id/service-accounts/:saId/credentials`, async (req, res) => {
    try {
      const { id: teamId, saId } = req.params;
      const authorized = await userIsTeamAdmin(req.user, teamId);
      if (!authorized)
        return res.status(401).json({
          success: false,
          message: 'You are not authorized to access api account credentials belonging to this team',
        });
      const result = await getServiceAccountCredentials(req.user.id, teamId, saId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`/teams/:id/service-accounts/:saId/credentials`, async (req, res) => {
    try {
      const { id: teamId, saId } = req.params;
      const authorized = await userIsTeamAdmin(req.user, teamId);
      if (!authorized)
        return res.status(401).json({
          success: false,
          message: 'You are not authorized to update api account credentials belonging to this team',
        });
      const result = await updateServiceAccountSecret(req.user.id, teamId, saId);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete(`/teams/:id/service-accounts/:saId`, async (req, res) => {
    try {
      const { id: teamId, saId } = req.params;
      const authorized = await userIsTeamAdmin(req.user, teamId);
      if (!authorized)
        return res.status(401).json({
          success: false,
          message: 'You are not authorized to delete api account belonging to this team',
        });
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
};

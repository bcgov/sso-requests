import { literal, Op } from 'sequelize';
import isNil from 'lodash/isNil';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { Session, User, UserTeam } from '@app/shared/interfaces';
import { lowcase } from '@app/helpers/string';
import { isAdmin } from '../utils/helpers';
import { Permission } from '@sso/authz';
import { authorizeIntegration } from '@app/queries/integrationAccess';
import { listRoleUsers, listUserRoles, manageUserRole, manageUserRoles } from '@app/keycloak/users';
import { canCreateOrDeleteRoles } from '@app/helpers/permissions';
import { EMAILS, EVENTS } from '@app/shared/enums';
import { sendTemplate } from '@app/shared/templates';
import { UserSurveyInformation } from '@app/shared/interfaces';
import { createEvent, runAuditedOperation } from '@app/queries/event';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import createHttpError from 'http-errors';
import { compact } from 'lodash';

import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'controllers/user' });

export const findOrCreateUser = async (session: Session) => {
  let { idir_userid, email } = session;
  email = lowcase(email || '');

  if (!idir_userid || !email) throw new createHttpError.Unauthorized('invalid IDIR account');

  const displayName = compact([session.given_name, session.family_name]).join(' ');
  const conditions = [{ idirEmail: email }, { idirUserid: idir_userid }];
  const users = await models.user.findAll({ where: { [Op.or]: conditions } });
  let user = users[0];

  // Edge case where newly added team member user already has an existing idir ID in our DB
  if (users.length > 1) {
    const userWithoutGuidRow = users.find((user: User) => user.idirUserid === null);
    const existingUserWithGuidRow = users.find((user: User) => user.idirUserid && user.idirEmail);
    // Remove the duplicate row and continue with the correct one
    if (existingUserWithGuidRow && userWithoutGuidRow) {
      log.info({ idirUserid: idir_userid }, 'duplicate user found, removing duplicate record');
      await sequelize.transaction(async (transaction) => {
        await userWithoutGuidRow.destroy({ transaction });
        await createEvent(
          {
            eventCode: EVENTS.USER_DELETE_SUCCESS,
            actorType: 'system',
            actorId: 'user-record-deduplication',
            details: { userId: userWithoutGuidRow.id, mergedIntoUserId: existingUserWithGuidRow.id },
          },
          transaction,
        );
      });
      user = existingUserWithGuidRow;
    }
  }

  if (user) {
    const before = {
      idirUserid: user.idirUserid,
      idirEmail: user.idirEmail,
      displayName: user.displayName,
    };
    // make sure the idir email is up-to-date for the account
    user.idirUserid = idir_userid;
    user.idirEmail = email;
    user.displayName = displayName;

    await sequelize.transaction(async (transaction) => {
      await user.save({ transaction });
      const changes = Object.fromEntries(
        Object.entries(before)
          .filter(([key, value]) => value !== user[key])
          .map(([key, value]) => [key, { before: value, after: user[key] }]),
      );
      if (Object.keys(changes).length > 0) {
        await createEvent(
          {
            eventCode: EVENTS.USER_UPDATE_SUCCESS,
            idirUserid: idir_userid,
            idirUserDisplayName: displayName,
            actorType: 'user',
            actorId: idir_userid,
            details: { userId: user.id, changes },
          },
          transaction,
        );
      }
    });
  } else {
    await sequelize.transaction(async (transaction) => {
      user = await models.user.create({ idirUserid: idir_userid, idirEmail: email, displayName }, { transaction });
      await createEvent(
        {
          eventCode: EVENTS.USER_CREATE_SUCCESS,
          idirUserid: idir_userid,
          idirUserDisplayName: displayName,
          actorType: 'user',
          actorId: idir_userid,
          details: { userId: user.id },
        },
        transaction,
      );
    });
  }

  return user.get({ plain: true });
};

export const updateProfile = async (
  session: Session,
  data: { additionalEmail?: string; hasReadGoldNotification?: boolean; surveySubmissions?: UserSurveyInformation },
) => {
  const { user } = session;
  const myself = await models.user.findOne({ where: { id: user?.id } });
  if (!myself) throw new createHttpError.NotFound('user not found');
  const before = {
    additionalEmail: myself.additionalEmail,
    surveySubmissions: myself.surveySubmissions,
    hasReadGoldNotification: myself.hasReadGoldNotification,
  };

  if (!isNil(data.additionalEmail)) myself.additionalEmail = lowcase(data.additionalEmail);
  if (!isNil(data.surveySubmissions)) myself.surveySubmissions = data.surveySubmissions;
  if (!isNil(data.hasReadGoldNotification)) myself.hasReadGoldNotification = data.hasReadGoldNotification;
  let updated = myself;
  await sequelize.transaction(async (transaction) => {
    updated = await myself.save({ transaction });

    if (!updated) {
      throw new createHttpError.UnprocessableEntity('update failed');
    }

    const changes = Object.fromEntries(
      Object.entries(before)
        .filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(updated[key]))
        .map(([key, value]) => [key, { before: value, after: updated[key] }]),
    );
    if (Object.keys(changes).length > 0) {
      await createEvent(
        {
          eventCode: EVENTS.USER_PROFILE_UPDATE_SUCCESS,
          idirUserid: session?.idir_userid,
          idirUserDisplayName: session?.user?.displayName,
          actorType: 'user',
          actorId: session?.idir_userid,
          details: { changes },
        },
        transaction,
      );
    }
  });

  return updated!.get({ plain: true });
};

export const createSurvey = (session: Session, data: { message?: string; rating: number; triggerEvent: string }) => {
  const { message, rating, triggerEvent } = data;
  return models.survey.create({
    userId: session?.user?.id,
    message,
    rating,
    triggerEvent,
  });
};

// The integration a role-mapping operation targets, or 403.
const authorizedIntegration = async (session: Session, integrationId: number, permission: Permission) => {
  const authorized = await authorizeIntegration(session, integrationId, permission);
  if (!authorized) throw new createHttpError.Forbidden('not allowed to access this integration');
  return authorized.integration;
};

export const listUsersByRole = async (
  session: Session,
  {
    environment,
    integrationId,
    roleName,
    first = 0,
    max = 50,
  }: {
    environment: string;
    integrationId: number;
    roleName: string;
    first: number;
    max: number;
  },
) => {
  const integration = await authorizedIntegration(session, integrationId, 'user-role-mappings:read');
  return await listRoleUsers(integration, {
    environment,
    roleName,
    first,
    max,
  });
};

export const updateUserRoleMapping = async (
  session: Session,
  {
    environment,
    integrationId,
    username,
    roleName,
    mode,
  }: {
    environment: string;
    integrationId: number;
    username: string;
    roleName: string;
    mode: 'add' | 'del';
  },
) => {
  const integration = await authorizedIntegration(session, integrationId, 'user-role-mappings:write');
  if (!roleName || !['add', 'del'].includes(mode)) {
    throw new createHttpError.BadRequest('invalid role mapping request');
  }
  const eventCode = mode === 'add' ? EVENTS.ROLE_ASSIGN_REQUESTED : EVENTS.ROLE_UNASSIGN_REQUESTED;
  const successCode = mode === 'add' ? EVENTS.ROLE_ASSIGN_SUCCESS : EVENTS.ROLE_UNASSIGN_SUCCESS;
  const failureCode = mode === 'add' ? EVENTS.ROLE_ASSIGN_FAILURE : EVENTS.ROLE_UNASSIGN_FAILURE;
  const roles = await runAuditedOperation(
    {
      eventCode,
      requestId: integration.id,
      idirUserid: session?.idir_userid,
      idirUserDisplayName: session?.user?.displayName,
      details: { username, roleName, environment },
    },
    successCode,
    failureCode,
    () => manageUserRole(integration, { environment, username, roleName, mode }),
  );
  return roles.map((role) => role.name);
};

export const updateUserRoleMappings = async (
  session: Session,
  {
    environment,
    integrationId,
    username,
    roleNames,
  }: {
    environment: string;
    integrationId: number;
    username: string;
    roleNames: string[];
  },
) => {
  const integration = await authorizedIntegration(session, integrationId, 'user-role-mappings:write');

  const requestedEvent = {
    requestId: integration.id,
    idirUserid: session?.idir_userid,
    idirUserDisplayName: session?.user?.displayName,
    eventCode: EVENTS.ROLE_BULK_RECONCILE_REQUESTED,
    details: { username, roleNames, environment },
  };
  let changes: { assigned: string[]; unassigned: string[] } | undefined;

  return runAuditedOperation(
    requestedEvent,
    EVENTS.ROLE_BULK_RECONCILE_SUCCESS,
    EVENTS.ROLE_BULK_RECONCILE_FAILURE,
    () =>
      manageUserRoles(integration, { environment, username, roleNames }, (diff, applyChanges) => {
        changes = diff;
        return applyChanges();
      }),
    () => ({ ...requestedEvent.details, ...changes }),
  );
};

export const listClientRolesByUsers = async (
  session: Session,
  {
    environment,
    integrationId,
    username,
  }: {
    environment: string;
    integrationId: number;
    username: string;
  },
) => {
  const integration = await authorizedIntegration(session, integrationId, 'user-role-mappings:read');
  const roles = await listUserRoles(integration, {
    environment,
    username,
  });
  return roles.map((role) => role.name);
};

export const isAllowedToManageRoles = async (session: Session, integrationId: number) => {
  const authorized = await authorizeIntegration(session, integrationId, 'roles:write');
  if (!authorized) return false;
  return canCreateOrDeleteRoles(authorized.integration);
};

/*
  Function called when cron job deletes users from keycloak, to notify any team members and fix and changed ownership:
  - If a user with client roles in any environment is deleted, all owners of that client are notified
  - If a user is deleted from production keycloak, and the user was the last admin on a team, gives our team ownership of that teams integrations
  - If a user is deleted from production keycloak and directly owned an integration, gives our team ownership of it
  - If a user is deleted from production keycloak and is on a team, notifies all team members
*/
export const deleteStaleUsers = async (
  user: UserRepresentation & { clientData: { client: string; roles: string[] }[]; env: string },
) => {
  try {
    const deletedFromProduction = user.env === 'prod';
    const userHadRoles = user?.clientData && user?.clientData?.length > 0;
    // Send formatted email with roles information to all integration owners if the deleted user had roles.
    if (userHadRoles) {
      await Promise.all(
        user.clientData.map(async (cl: { client: string; roles: string[] }) => {
          const integration = await models.request.findOne({
            where: {
              clientId: cl.client,
            },
            raw: true,
          });
          if (!integration || integration.archived) return false;
          await sendTemplate(EMAILS.DELETE_INACTIVE_IDIR_USER, {
            integration,
            teamId: integration.teamId,
            username: user?.attributes?.idir_username || user.username,
            clientId: cl.client,
            roles: cl.roles,
            env: user.env,
          });
        }),
      );
    }

    // User management handling only applies to production user deletions.
    if (!deletedFromProduction) return true;

    if (!user?.attributes?.idir_user_guid) throw new createHttpError.BadRequest('user guid is required');

    const existingUser = await models.user.findOne({ where: { idir_userid: user.attributes.idir_user_guid } });
    const ssoUser = await models.user.findOne({
      where: { idir_email: 'bcgov.sso@gov.bc.ca' },
      raw: true,
    });

    if (!existingUser) return false;
    if (!ssoUser) throw new createHttpError.BadRequest('user(bcgov.sso@gov.bc.ca) not found');

    // Fetch all teams the user is on
    const teams = await models.usersTeam.findAll({
      where: {
        user_id: existingUser.id,
        pending: false,
      },
      attributes: {
        include: [[literal('team.name'), 'teamName']],
      },
      include: [
        {
          model: models.team,
          required: true,
          attributes: [],
        },
      ],
      raw: true,
    });

    for (let team of teams) {
      const teamAdmins = await models.usersTeam.findAll({
        where: {
          team_id: team.teamId,
          role: 'admin',
          pending: false,
        },
        raw: true,
      });

      // Assign us to the team if this user was the only existing admin
      if (teamAdmins.length === 1 && teamAdmins[0].userId === existingUser.id) {
        const orphanedRequests = await models.request.findAll({
          where: { teamId: team.teamId },
        });
        await sequelize.transaction(async (transaction) => {
          await models.usersTeam.create(
            { role: 'admin', pending: false, teamId: team.teamId, userId: ssoUser.id },
            { transaction },
          );
          for (const integration of orphanedRequests) {
            // Override userid regardless of archive status, to avoid bad foreign key refs
            integration.userId = ssoUser.id;
            await integration.save({ transaction });
            await createEvent(
              {
                eventCode: EVENTS.TRANSFER_OF_OWNERSHIP_SUCCESS,
                requestId: integration.id,
                teamId: team.teamId,
                actorType: 'system',
                actorId: 'stale-user-cleanup',
                details: { fromUserId: existingUser.id, toUserId: ssoUser.id, teamId: team.teamId },
              },
              transaction,
            );
          }
        });
        await Promise.all(
          orphanedRequests
            .filter((integration: any) => !integration.archived)
            .map((integration: any) =>
              sendTemplate(EMAILS.ORPHAN_INTEGRATION, {
                integration,
                teamId: team.teamId,
                username: user?.attributes?.idir_username ?? user.username,
                clientId: teamAdmins[0].integrationId,
                teamAdmin: team.role === 'admin',
                roles: [],
                env: user.env,
              }),
            ),
        );
      }
      // If there are other admins, just notify them of the change
      else if (teamAdmins.length > 0) {
        // Update any references to the deleted user id to ours
        const affectedRequests = await models.request.findAll({
          where: { userId: existingUser.id, teamId: team.teamId },
          attributes: ['id'],
          raw: true,
        });
        await sequelize.transaction(async (transaction) => {
          await models.request.update(
            { userId: ssoUser.id },
            { where: { userId: existingUser.id, teamId: team.teamId }, transaction },
          );
          await Promise.all(
            affectedRequests.map((request: { id: number }) =>
              createEvent(
                {
                  eventCode: EVENTS.TRANSFER_OF_OWNERSHIP_SUCCESS,
                  requestId: request.id,
                  teamId: team.teamId,
                  actorType: 'system',
                  actorId: 'stale-user-cleanup',
                  details: { fromUserId: existingUser.id, toUserId: ssoUser.id, teamId: team.teamId },
                },
                transaction,
              ),
            ),
          );
        });
        const otherAdmins = await models.user.findAll({
          where: { id: { [Op.not]: existingUser.id } },
          include: [
            {
              model: models.usersTeam,
              where: { teamId: team.teamId, role: 'admin', pending: false },
              required: true,
              attributes: [],
            },
          ],
          attributes: ['id', 'idirEmail', 'additionalEmail'],
          raw: true,
        });
        const otherAdminEmails = otherAdmins.reduce(
          (acc: any, curr: any) => acc.concat(curr.idirEmail).concat(curr.additionalEmail ?? []),
          [],
        );
        await sendTemplate(EMAILS.REMOVE_INACTIVE_IDIR_USER_FROM_TEAM, {
          username: user.attributes.idir_username ?? user.username,
          teamName: team.teamName,
          emails: otherAdminEmails,
        });
      }
    }

    // non-team integrations
    const nonTeamRequests = await models.request.findAll({
      where: {
        apiServiceAccount: false,
        usesTeam: false,
        userId: existingUser.id,
        teamId: null,
      },
    });

    if (nonTeamRequests.length > 0) {
      for (let rqst of nonTeamRequests) {
        try {
          // assign sso team user
          await sequelize.transaction(async (transaction) => {
            rqst.userId = ssoUser.id;
            await rqst.save({ transaction });
            await createEvent(
              {
                eventCode: EVENTS.TRANSFER_OF_OWNERSHIP_SUCCESS,
                requestId: rqst.id,
                actorType: 'system',
                actorId: 'stale-user-cleanup',
                details: { fromUserId: existingUser.id, toUserId: ssoUser.id },
              },
              transaction,
            );
          });
        } catch (err) {
          log.error({ err, requestId: rqst?.id }, 'failed to transfer integration to the SSO team');
          await createEvent({
            eventCode: EVENTS.TRANSFER_OF_OWNERSHIP_FAILURE,
            requestId: rqst?.id,
            actorType: 'system',
            actorId: 'stale-user-cleanup',
            details: { fromUserId: existingUser.id, toUserId: ssoUser.id },
          });
          continue;
        }

        if (!rqst.archived) {
          try {
            await sendTemplate(EMAILS.ORPHAN_INTEGRATION, { integration: rqst });
          } catch (err) {
            log.error({ err, requestId: rqst.id }, 'failed to notify the SSO team about transferred integration');
          }
        }
      }
    }

    await sequelize.transaction(async (transaction) => {
      await existingUser.destroy({ transaction });
      await Promise.all([
        ...teams.map((team: any) =>
          createEvent(
            {
              eventCode: EVENTS.TEAM_MEMBER_REMOVED,
              teamId: team.teamId,
              actorType: 'system',
              actorId: 'stale-user-cleanup',
              details: { userId: existingUser.id, role: team.role, reason: 'user-deleted' },
            },
            transaction,
          ),
        ),
        createEvent(
          {
            eventCode: EVENTS.USER_DELETE_SUCCESS,
            actorType: 'system',
            actorId: 'stale-user-cleanup',
            details: { userId: existingUser.id, idirUserid: existingUser.idirUserid },
          },
          transaction,
        ),
      ]);
    });
    return true;
  } catch (err) {
    log.error({ err }, 'deleteStaleUsers failed');
    throw new createHttpError.UnprocessableEntity((err as any).message || err);
  }
};

export const processUserSession = async (session: Session): Promise<{ session: Session; user: User }> => {
  const user: any = await findOrCreateUser(session);
  user.isAdmin = isAdmin(session);
  session.user = user;
  return { session, user };
};

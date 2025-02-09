import { Op } from 'sequelize';
import isNil from 'lodash/isNil';
import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import { lowcase } from '@lambda-app/helpers/string';
import { getDisplayName, isAdmin } from '../utils/helpers';
import { findAllowedIntegrationInfo, getIntegrationById } from '@lambda-app/queries/request';
import { listRoleUsers, listUserRoles, manageUserRole, manageUserRoles } from '@lambda-app/keycloak/users';
import { canCreateOrDeleteRoles } from '@app/helpers/permissions';
import { EMAILS, EVENTS } from '@lambda-shared/enums';
import { sendTemplate } from '@lambda-shared/templates';
import { getAllEmailsOfTeam } from '@lambda-app/queries/team';
import { UserSurveyInformation } from '@lambda-shared/interfaces';
import { createEvent, processIntegrationRequest } from './requests';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import createHttpError from 'http-errors';

export const findOrCreateUser = async (session: Session) => {
  let { idir_userid, email } = session;
  email = lowcase(email);

  if (!idir_userid || !email) throw new createHttpError.Unauthorized('invalid IDIR account');

  const displayName = getDisplayName(session);
  const conditions = [{ idirEmail: email }, { idirUserid: idir_userid }];
  const users = await models.user.findAll({ where: { [Op.or]: conditions } });
  let user = users[0];

  // Edge case where an invited user already has an existing idir ID in our DB
  if (users.length > 1) {
    const emailInviteRow = users.find((user) => user.idirUserid === null);
    const fullRow = users.find((user) => user.idirUserid && user.idirEmail);
    // Remove the duplicate row and continue with the correct one
    if (fullRow && emailInviteRow) {
      console.info(`Duplicate user found for id ${idir_userid}. Removing duplicate record.`);
      await emailInviteRow.destroy();
      user = fullRow;
    }
  }

  if (user) {
    // make sure the idir email is up-to-date for the account
    user.idirUserid = idir_userid;
    user.idirEmail = email;
    user.displayName = displayName;

    await user.save();
  } else {
    user = await models.user.create({ idirUserid: idir_userid, idirEmail: email, displayName });
  }

  return user.get({ plain: true });
};

export const updateProfile = async (
  session: Session,
  data: { additionalEmail?: string; hasReadGoldNotification?: boolean; surveySubmissions?: UserSurveyInformation },
) => {
  const { user } = session;
  const myself = await models.user.findOne({ where: { id: user.id } });

  if (!isNil(data.additionalEmail)) myself.additionalEmail = lowcase(data.additionalEmail);
  if (!isNil(data.surveySubmissions)) myself.surveySubmissions = data.surveySubmissions;
  if (!isNil(data.hasReadGoldNotification)) myself.hasReadGoldNotification = data.hasReadGoldNotification;
  const updated = await myself.save();

  if (!updated) {
    throw new createHttpError.UnprocessableEntity('update failed');
  }

  return updated.get({ plain: true });
};

export const createSurvey = (session: Session, data: { message?: string; rating: number; triggerEvent: string }) => {
  const { message, rating, triggerEvent } = data;
  return models.survey.create({
    userId: session.user.id,
    message,
    rating,
    triggerEvent,
  });
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
  const integration = isAdmin(session)
    ? await getIntegrationById(integrationId)
    : await findAllowedIntegrationInfo(session.user.id, integrationId);
  if (integration.authType === 'service-account') throw new createHttpError.BadRequest('invalid auth type');
  return await listRoleUsers(integration, {
    environment,
    roleName,
    first,
    max,
  });
};

export const updateUserRoleMapping = async (
  sessionUserId: number,
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
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);
  const roles = await manageUserRole(integration, { environment, username, roleName, mode });
  return roles.map((role) => role.name);
};

export const updateUserRoleMappings = async (
  sessionUserId: number,
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
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);
  return await manageUserRoles(integration, { environment, username, roleNames });
};

export const listClientRolesByUsers = async (
  sessionUserId: number,
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
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);
  const roles = await listUserRoles(integration, {
    environment,
    username,
  });
  return roles.map((role) => role.name);
};

export const isAllowedToManageRoles = async (session: Session, integrationId: number) => {
  const integration = await findAllowedIntegrationInfo(session.user.id, integrationId);
  return canCreateOrDeleteRoles(integration);
};

export const deleteStaleUsers = async (
  user: UserRepresentation & { clientData: { client: string; roles: string[] }[]; env: string },
) => {
  try {
    const deletedFromProduction = user.env === 'prod';
    const userHadRoles = user?.clientData && user?.clientData?.length > 0;
    // Send formatted email with roles information to all team members if the deleted user had roles.
    if (userHadRoles) {
      await Promise.all(
        user.clientData.map(async (cl: { client: string; roles: string[] }) => {
          const integration = await models.request.findOne({
            where: {
              clientId: cl.client,
            },
            raw: true,
          });
          if (integration?.teamId && !integration.archived) {
            const userEmails = await getAllEmailsOfTeam(integration.teamId);
            let isTeamAdmin = false;
            // Only production users affect team management
            if (deletedFromProduction) {
              userEmails.map((u) => {
                if (u.idir_email === user.email && u.role === 'admin') {
                  isTeamAdmin = true;
                }
              });
            }
            await sendTemplate(EMAILS.DELETE_INACTIVE_IDIR_USER, {
              teamId: integration.teamId,
              username: user.attributes.idir_username || user.username,
              clientId: cl.client,
              roles: cl.roles,
              env: user.env,
              teamAdmin: isTeamAdmin,
            });
          }
        }),
      );
    }

    // User management handling only applies to production user deletions.
    if (!deletedFromProduction) return true;

    if (!user.attributes.idir_user_guid) throw new createHttpError.BadRequest('user guid is required');

    const existingUser = await models.user.findOne({ where: { idir_userid: user.attributes.idir_user_guid } });
    const ssoUser = await models.user.findOne({
      where: { idir_email: 'bcgov.sso@gov.bc.ca' },
      raw: true,
    });

    if (!ssoUser) throw new createHttpError.BadRequest('user(bcgov.sso@gov.bc.ca) not found');

    if (existingUser) {
      const teams = await models.usersTeam.findAll({
        where: {
          user_id: existingUser.id,
          pending: false,
        },
        raw: true,
      });

      if (teams.length > 0) {
        for (let team of teams) {
          let addedSsoTeamUserAsAdmin = false;
          // If the userId on an integration is the deleted user, reassign it to us and add us to its owning team.
          const teamRequests = await models.request.findAll({
            where: {
              apiServiceAccount: false,
              usesTeam: true,
              userId: existingUser.id,
              teamId: team.teamId,
            },
          });

          if (teamRequests.length > 0) {
            // add sso team user to team
            await models.usersTeam.create({
              role: 'admin',
              pending: false,
              teamId: team.teamId,
              userId: ssoUser.id,
            });

            addedSsoTeamUserAsAdmin = true;

            for (let rqst of teamRequests) {
              // assign sso team user
              rqst.userId = ssoUser.id;
              await rqst.save();
              // Notification was already sent above if roles were included.
              if (!userHadRoles && !rqst.archived) {
                await sendTemplate(EMAILS.DELETE_INACTIVE_IDIR_USER, {
                  teamId: rqst.teamId,
                  username: user.attributes.idir_username || user.username,
                  clientId: rqst.id,
                  teamAdmin: team.role === 'admin',
                  roles: [],
                  env: user.env,
                });
              }
            }
          }
          // If the user was not the initial creator, but still the only admin, also reassign it to us.
          const teamAdmins = await models.usersTeam.findAll({
            where: {
              team_id: team.teamId,
              role: 'admin',
              pending: false,
            },
            raw: true,
          });

          if (!addedSsoTeamUserAsAdmin) {
            // if a team has only inactive user as the admin. Add sso team user
            if (teamAdmins.length === 1 && teamAdmins.find((adm) => adm.userId === existingUser.id)) {
              await models.usersTeam.create({ role: 'admin', pending: false, teamId: team.teamId, userId: ssoUser.id });
            }
          }
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
            rqst.userId = ssoUser.id;
            await rqst.save();

            if (!rqst.archived) {
              await sendTemplate(EMAILS.ORPHAN_INTEGRATION, {
                integration: rqst,
              });
            }
          } catch (err) {
            console.log(err);
            createEvent({
              eventCode: EVENTS.TRANSFER_OF_OWNERSHIP_FAILURE,
              requestId: rqst?.id,
              userId: ssoUser.id,
            });
          }
        }
      }

      await existingUser.destroy();

      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error(err);
    throw new createHttpError.UnprocessableEntity(err.message || err);
  }
};

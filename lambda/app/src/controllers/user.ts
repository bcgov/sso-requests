import { Op } from 'sequelize';
import isNil from 'lodash/isNil';
import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import { lowcase } from '@lambda-app/helpers/string';
import { getDisplayName } from '../utils/helpers';
import { findAllowedIntegrationInfo } from '@lambda-app/queries/request';
import { listRoleUsers, listUserRoles, manageUserRole, manageUserRoles } from '@lambda-app/keycloak/users';
import { canCreateOrDeleteRoles } from '@app/helpers/permissions';

export const findOrCreateUser = async (session: Session) => {
  let { idir_userid, email } = session;
  email = lowcase(email);

  if (!idir_userid || !email) throw Error('invalid IDIR account');

  const displayName = getDisplayName(session);
  const conditions = [{ idirEmail: email }, { idirUserid: idir_userid }];
  let user = await models.user.findOne({ where: { [Op.or]: conditions } });

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
  data: { additionalEmail?: string; hasReadGoldNotification?: boolean },
) => {
  const { user } = session;
  const myself = await models.user.findOne({ where: { id: user.id } });

  if (!isNil(data.additionalEmail)) myself.additionalEmail = lowcase(data.additionalEmail);
  if (!isNil(data.hasReadGoldNotification)) myself.hasReadGoldNotification = data.hasReadGoldNotification;
  const updated = await myself.save();

  if (!updated) {
    throw Error('update failed');
  }

  return updated.get({ plain: true });
};

export const listUsersByRole = async (
  sessionUserId: number,
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
  const integration = await findAllowedIntegrationInfo(sessionUserId, integrationId);
  if (integration.authType === 'service-account') throw Error('invalid auth type');
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
  if (integration.authType === 'service-account') throw Error('invalid auth type');
  return await manageUserRole(integration, { environment, username, roleName, mode });
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
  if (integration.authType === 'service-account') throw Error('invalid auth type');
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
  if (integration.authType === 'service-account') throw Error('invalid auth type');
  return await listUserRoles(integration, {
    environment,
    username,
  });
};

export const isAllowedToManageRoles = async (session: Session, integrationId: number) => {
  const integration = await findAllowedIntegrationInfo(session.user.id, integrationId);
  return canCreateOrDeleteRoles(integration);
};

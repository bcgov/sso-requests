import { isObject, omit, sortBy, compact } from 'lodash';
import { Op } from 'sequelize';
import { diff } from 'deep-diff';
import { Request } from '@app/interfaces/Request';
import { getSchemas } from '@app/schemas';
import { validateForm } from '@app/utils/validate';
import { Session, Data, User } from '@lambda-shared/interfaces';
import { sendTemplate } from '@lambda-shared/templates';
import { EMAILS } from '@lambda-shared/enums';
import { sequelize, models } from '@lambda-shared/sequelize/models/models';
import { getTeamById } from '../queries/team';
import { generateInvitationToken } from '@lambda-app/helpers/token';

export const errorMessage = 'No changes submitted. Please change your details to update your integration.';
export const IDIM_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

export const omitNonFormFields = (data: Request) =>
  omit(data, [
    'updatedAt',
    'createdAt',
    'archived',
    'status',
    'environments',
    'actionNumber',
    'prNumber',
    'clientId',
    'userId',
    'idirUserid',
    'idirUserDisplayName',
    'id',
  ]);

export type BceidEvent = 'submission' | 'deletion' | 'update';
const bceidRealms = ['onestopauth-basic', 'onestopauth-business', 'onestopauth-both'];

export const usesBceid = (integration: any) => {
  if (!integration) return false;

  if (integration.serviceType === 'gold') {
    return integration.devIdps.some((idp) => idp.startsWith('bceid'));
  } else {
    return bceidRealms.includes(integration.realm);
  }
};

const sortURIFields = (data: any) => {
  const sortedData = { ...data };
  const { devValidRedirectUris, testValidRedirectUris, prodValidRedirectUris } = data;
  sortedData.devValidRedirectUris = sortBy(devValidRedirectUris);
  sortedData.testValidRedirectUris = sortBy(testValidRedirectUris);
  sortedData.prodValidRedirectUris = sortBy(prodValidRedirectUris);
  return sortedData;
};

export const processRequest = (data: any, isMerged: boolean, isAdmin: boolean) => {
  const immutableFields = ['userId', 'idirUserid', 'clientId', 'projectLead', 'status', 'serviceType'];
  if (isMerged) immutableFields.push('realm');
  if (!isAdmin)
    immutableFields.push(
      'devAccessTokenLifespan',
      'devSessionIdleTimeout',
      'devSessionMaxLifespan',
      'devOfflineSessionIdleTimeout',
      'devOfflineSessionMaxLifespan',

      'testAccessTokenLifespan',
      'testSessionIdleTimeout',
      'testSessionMaxLifespan',
      'testOfflineSessionIdleTimeout',
      'testOfflineSessionMaxLifespan',

      'prodAccessTokenLifespan',
      'prodSessionIdleTimeout',
      'prodSessionMaxLifespan',
      'prodOfflineSessionIdleTimeout',
      'prodOfflineSessionMaxLifespan',
    );

  data = omit(data, immutableFields);
  data = sortURIFields(data);
  data.testIdps = data.testIdps || [];
  data.prodIdps = data.prodIdps || [];

  data.devRoles = compact(data.devRoles || []);
  data.testRoles = compact(data.testRoles || []);
  data.prodRoles = compact(data.prodRoles || []);

  return data;
};

export const getDifferences = (newData: any, originalData: Request) => {
  newData = sortURIFields(newData);
  if (newData.usesTeam === true) newData.teamId = parseInt(newData.teamId);
  return diff(omitNonFormFields(originalData), omitNonFormFields(newData));
};

export const validateRequest = (formData: any, original: Request, isUpdate = false, teams: any[]) => {
  // if (isUpdate) {
  //   const differences = getDifferences(formData, original);
  //   if (!differences) return errorMessage;
  // }

  const schemas = getSchemas({ formData, teams });
  return validateForm(formData, schemas);
};

export const isAdmin = (session: Session) => session.client_roles?.includes('sso-admin');
export const getDisplayName = (session: Session) => compact([session.given_name, session.family_name]).join(' ');

export const getWhereClauseForAllRequests = (data: {
  searchField: string[];
  searchKey: string;
  status?: string;
  archiveStatus?: string;
  realms?: string[];
  environments?: string[];
  types?: string[];
}) => {
  const where: any = {};
  const { searchField, searchKey, status = [], archiveStatus = [], realms, environments, types } = data;

  if (searchKey && searchField && searchField.length > 0) {
    where[Op.or] = [];
    searchField.forEach((field) => {
      if (field === 'id') {
        const id = Number(searchKey);
        if (!Number.isNaN(id)) where[Op.or].push({ id });
      } else {
        where[Op.or].push({ [field]: { [Op.iLike]: `%${searchKey}%` } });
      }
    });
  }

  if (status.length > 0) {
    where.status = {
      [Op.in]: status,
    };
  }

  if (archiveStatus.length === 1) {
    where.archived = archiveStatus[0] === 'archived';
  }

  if (realms)
    where.realm = {
      [Op.in]: realms,
    };

  if (environments)
    where.environments = {
      [Op.overlap]: environments,
    };

  if (types?.length > 0)
    where.serviceType = {
      [Op.in]: types,
    };

  return where;
};

export async function getUsersTeams(user) {
  return models.team
    .findAll({
      where: {
        id: { [Op.in]: sequelize.literal(`(select team_id from users_teams where user_id='${user.id}')`) },
      },
    })
    .then((res) => res.map((res) => res.dataValues));
}

export async function inviteTeamMembers(users: User[], teamId: number) {
  const team = await getTeamById(teamId);
  if (!team) return;

  return Promise.all(
    users.map(async (user) => {
      const invitationLink = generateInvitationToken(user, team.id);
      const { idirEmail: email } = user;
      await sendTemplate(EMAILS.TEAM_INVITATION, { email, team, invitationLink });
      return true;
    }),
  );
}

import omit from 'lodash.omit';
import sortBy from 'lodash.sortby';
import compact from 'lodash.compact';
import { Op } from 'sequelize';
import { diff } from 'deep-diff';
import { Integration } from '@app/interfaces/Request';
import { getSchemas, oidcDurationAdditionalFields, samlDurationAdditionalFields } from '@app/schemas';
import { validateForm } from '@app/utils/validate';
import { Session, User } from '@lambda-shared/interfaces';
import { sendTemplate } from '@lambda-shared/templates';
import { EMAILS } from '@lambda-shared/enums';
import { sequelize, models } from '@lambda-shared/sequelize/models/models';
import { getTeamById } from '../queries/team';
import { generateInvitationToken } from '@lambda-app/helpers/token';

export const errorMessage = 'No changes submitted. Please change your details to update your integration.';
export const IDIM_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

export const omitNonFormFields = (data: Integration) =>
  omit(data, [
    'updatedAt',
    'createdAt',
    'archived',
    'status',
    'environments',
    'actionNumber',
    'prNumber',
    'userId',
    'idirUserid',
    'idirUserDisplayName',
    'id',
  ]);

export type BceidEvent = 'submission' | 'deletion' | 'update';

const sortURIFields = (data: any) => {
  const sortedData = { ...data };
  const { devValidRedirectUris, testValidRedirectUris, prodValidRedirectUris } = data;
  sortedData.devValidRedirectUris = sortBy(devValidRedirectUris);
  sortedData.testValidRedirectUris = sortBy(testValidRedirectUris);
  sortedData.prodValidRedirectUris = sortBy(prodValidRedirectUris);
  return sortedData;
};

const durationAdditionalFields = [];
['dev', 'test', 'prod'].forEach((env) => {
  const addDurationAdditionalField = (field) => durationAdditionalFields.push(`${env}${field}`);
  oidcDurationAdditionalFields.forEach(addDurationAdditionalField);
  samlDurationAdditionalFields.forEach(addDurationAdditionalField);
});

export const processRequest = (data: any, isMerged: boolean, isAdmin: boolean) => {
  const immutableFields = ['user', 'userId', 'idirUserid', 'status', 'serviceType', 'lastChanges'];

  if (isMerged) {
    immutableFields.push('realm');
    if (data?.protocol === 'saml') immutableFields.push('projectName');
  }
  // client id cannot be updated by non-admin
  if (!isAdmin) immutableFields.push(...durationAdditionalFields, 'clientId');

  data = omit(data, immutableFields);
  data = sortURIFields(data);
  data.testIdps = data.testIdps || [];
  data.prodIdps = data.prodIdps || [];

  data.devRoles = compact(data.devRoles || []);
  data.testRoles = compact(data.testRoles || []);
  data.prodRoles = compact(data.prodRoles || []);

  if (data.protocol === 'saml') data.authType = 'browser-login';

  if (data?.usesTeam === false) {
    data.teamId = null;
    data.team = null;
  } else if (data?.usesTeam === true) data.projectLead = false;

  console.log('processRequest', data);

  return data;
};

export const getDifferences = (newData: any, originalData: Integration) => {
  newData = sortURIFields(newData);
  if (newData.usesTeam === true) newData.teamId = parseInt(newData.teamId);
  return diff(omitNonFormFields(originalData), omitNonFormFields(newData));
};

export const validateRequest = (formData: any, original: Integration, isUpdate = false, teams: any[]) => {
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
  devIdps?: string[];
}) => {
  const where: any = {};
  const { searchField, searchKey, status = [], archiveStatus = [], realms, devIdps, environments, types } = data;

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

  // silver and gold IDPs are in different columns requiring an `and or` query
  if (realms && !devIdps) {
    where.realm = {
      [Op.in]: realms,
    };
  } else if (!realms && devIdps) {
    where.dev_idps = {
      [Op.overlap]: devIdps,
    };
  } else if (realms && devIdps) {
    where[Op.and] = [
      {
        [Op.or]: [{ realm: { [Op.in]: realms } }, { dev_idps: { [Op.overlap]: devIdps } }],
      },
    ];
  }

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

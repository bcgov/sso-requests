import { isObject, omit, sortBy, compact } from 'lodash';
import { Op } from 'sequelize';
import { diff } from 'deep-diff';
import validate from 'react-jsonschema-form/lib/validate';
import { Request } from '@app/interfaces/Request';
import providerSchema from '@app/schemas/shared/providers';
import requesterSchema from '@app/schemas/shared/requester-info';
import termsAndConditionsSchema from '@app/schemas/shared/terms-and-conditions';
import { customValidate } from '@app/utils/customValidate';
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
    'clientName',
    'userId',
    'idirUserid',
    'idirUserDisplayName',
    'id',
  ]);

export type BceidEvent = 'submission' | 'deletion' | 'update';
const bceidRealms = ['onestopauth-basic', 'onestopauth-business', 'onestopauth-both'];

export const usesBceid = (realm: string | undefined) => {
  if (!realm) return false;
  return bceidRealms.includes(realm);
};

const sortURIFields = (data: any) => {
  const sortedData = { ...data };
  const { devValidRedirectUris, testValidRedirectUris, prodValidRedirectUris } = data;
  sortedData.devValidRedirectUris = sortBy(devValidRedirectUris);
  sortedData.testValidRedirectUris = sortBy(testValidRedirectUris);
  sortedData.prodValidRedirectUris = sortBy(prodValidRedirectUris);
  return sortedData;
};

export const processRequest = (data: any, isMerged: boolean) => {
  const immutableFields = ['userId', 'idirUserid', 'clientName', 'projectLead', 'status'];
  if (isMerged) immutableFields.push('realm');
  data = omit(data, immutableFields);
  data = sortURIFields(data);
  data.environments = processEnvironments(data);

  return data;
};

const processEnvironments = (data: any) => {
  const environments = [];
  if (data.dev) environments.push('dev');
  if (data.test) environments.push('test');
  if (data.prod) environments.push('prod');
  return environments;
};

export const getDifferences = (newData: any, originalData: Request) => {
  newData = sortURIFields(newData);
  if (newData.usesTeam === true) newData.teamId = parseInt(newData.teamId);
  return diff(omitNonFormFields(originalData), omitNonFormFields(newData));
};

export const validateRequest = (formData: any, original: Request, isUpdate = false, teams: any[]) => {
  if (isUpdate) {
    const differences = getDifferences(formData, original);
    if (!differences) return { message: errorMessage };
  }

  const { errors: firstPageErrors } = validate(formData, requesterSchema(teams));
  const { errors: secondPageErrors } = validate(formData, providerSchema, customValidate);
  const { errors: thirdPageErrors } = validate(formData, termsAndConditionsSchema);
  const allValid = firstPageErrors.length === 0 && secondPageErrors.length === 0 && thirdPageErrors.length === 0;
  if (allValid) return true;
  return {
    firstPageErrors,
    secondPageErrors,
    thirdPageErrors,
  };
};

// GH actions inputs expects an object where all values are strings
export const stringifyGithubInputs = (inputs: any) => {
  const stringifiedInputs = {};
  Object.entries(inputs).forEach(([key, value]) => {
    if (isObject(value) || Array.isArray(value)) {
      stringifiedInputs[key] = JSON.stringify(value);
    } else {
      stringifiedInputs[key] = String(value);
    }
  });

  return stringifiedInputs;
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
    where.type = {
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

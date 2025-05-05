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
import { getTeamById, isTeamAdmin } from '../queries/team';
import { generateInvitationToken } from '@lambda-app/helpers/token';
import { getAttributes, getPrivacyZones } from '@lambda-app/controllers/bc-services-card';
import { usesBcServicesCard } from '@app/helpers/integration';
import createHttpError from 'http-errors';

export const errorMessage = 'No changes submitted. Please change your details to update your integration.';
export const IDIM_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

let cachedClaims = [];

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
  durationAdditionalFields.push(`${env}OfflineAccessEnabled`);
});

export const processRequest = (session: Session, data: Integration, isMerged: boolean) => {
  const isAdminUser = isAdmin(session);

  let immutableFields = ['user', 'userId', 'idirUserid', 'status', 'serviceType', 'lastChanges'];

  if (isMerged) {
    immutableFields.push('realm');
  }

  if (!isAdminUser) {
    immutableFields.push(...durationAdditionalFields, 'clientId');

    if (!isBceidApprover(session)) {
      immutableFields.push('bceidApproved');
    }

    if (!isGithubApprover(session)) {
      immutableFields.push('githubApproved');
    }

    if (!isBCServicesCardApprover(session)) {
      immutableFields.push('bcServicesCardApproved');
    }
  }

  if (isAdminUser) {
    if (data?.protocol === 'oidc') {
      ['dev', 'test', 'prod'].forEach((env) => {
        if (!data[`${env}OfflineAccessEnabled`])
          immutableFields.push(`${env}OfflineSessionIdleTimeout`, `${env}OfflineSessionMaxLifespan`);
      });
    }
  }

  data = omit(data, immutableFields);
  data = sortURIFields(data);
  data.testIdps = data.testIdps || [];
  data.prodIdps = data.prodIdps || [];

  data.devRoles = compact(data.devRoles || []);
  data.testRoles = compact(data.testRoles || []);
  data.prodRoles = compact(data.prodRoles || []);

  if (data.protocol === 'saml') data.authType = 'browser-login';

  if (data?.usesTeam === true) data.projectLead = false;

  return data;
};

export const getDifferences = (newData: any, originalData: Integration) => {
  newData = sortURIFields(newData);
  if (newData.usesTeam === true) newData.teamId = parseInt(newData.teamId);
  return diff(omitNonFormFields(originalData), omitNonFormFields(newData));
};

export const validateRequest = async (formData: any, original: Integration, teams: any[], isUpdate = false) => {
  const validationArgs: any = { formData, teams };

  if (usesBcServicesCard(formData)) {
    const [validPrivacyZones, validAttributes] = await Promise.all([getPrivacyZones(), getAttributes()]);
    validationArgs.bcscPrivacyZones = validPrivacyZones;
    validationArgs.bcscAttributes = validAttributes;
  }
  const schemas = getSchemas(validationArgs);
  return validateForm(formData, schemas);
};

export const isAdmin = (session: Session) => session.client_roles?.includes('sso-admin');

export const isBceidApprover = (session: Session) => session.client_roles?.includes('bceid-approver');

export const isGithubApprover = (session: Session) => session.client_roles?.includes('github-approver');

export const isBCServicesCardApprover = (session: Session) =>
  session.client_roles?.includes('bc-services-card-approver');

export const getAllowedIdpsForApprover = (session: Session) => {
  const idps = [];
  if (session.client_roles.length === 0) return idps;
  session.client_roles.forEach((role) => {
    if (role === 'bceid-approver') idps.push('bceidbasic', 'bceidbusiness', 'bceidboth');
    if (role === 'bc-services-card-approver') idps.push('bcservicescard');
    if (role === 'github-approver') idps.push('githubbcgov', 'githubpublic');
    if (role === 'social-approver') idps.push('social');
  });
  return idps;
};

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

export async function inviteTeamMembers(userId: number, users: (User & { role: string })[], teamId: number) {
  const authorized = await isTeamAdmin(userId, teamId);
  if (!authorized) throw new createHttpError.Forbidden(`not allowed to invite members for the team #${teamId}`);
  const team = await getTeamById(teamId);
  return Promise.all(
    users.map(async (user) => {
      const invitationLink = generateInvitationToken(user, team.id);
      const { idirEmail: email, role } = user;
      await sendTemplate(EMAILS.TEAM_INVITATION, { email, team, invitationLink, role });
      return true;
    }),
  );
}

export const getBCSCEnvVars = (env: string) => {
  let bcscBaseUrl: string;
  let accessToken: string;
  let kcBaseUrl: string;

  if (env === 'dev') {
    bcscBaseUrl = process.env.BCSC_REGISTRATION_BASE_URL_DEV;
    accessToken = process.env.BCSC_INITIAL_ACCESS_TOKEN_DEV;
    kcBaseUrl = process.env.KEYCLOAK_V2_DEV_URL;
  }
  if (env === 'test') {
    bcscBaseUrl = process.env.BCSC_REGISTRATION_BASE_URL_TEST;
    accessToken = process.env.BCSC_INITIAL_ACCESS_TOKEN_TEST;
    kcBaseUrl = process.env.KEYCLOAK_V2_TEST_URL;
  }
  if (env === 'prod') {
    bcscBaseUrl = process.env.BCSC_REGISTRATION_BASE_URL_PROD;
    accessToken = process.env.BCSC_INITIAL_ACCESS_TOKEN_PROD;
    kcBaseUrl = process.env.KEYCLOAK_V2_PROD_URL;
  }
  return {
    bcscBaseUrl,
    accessToken,
    kcBaseUrl,
  };
};

export const getRequiredBCSCScopes = async (claims: string[]) => {
  if (cachedClaims.length === 0) {
    cachedClaims = await getAttributes();
  }
  const allClaims = cachedClaims;
  const requiredScopes = allClaims.filter((claim) => claims.includes(claim.name)).map((claim) => claim.scope);

  // Profile will always be a required scope since the sub depends on it
  if (!requiredScopes.includes('profile')) {
    requiredScopes.push('profile');
  }
  return ['openid', ...new Set(requiredScopes)];
};

export const compareTwoArrays = (arr1: string[], arr2: string[]) => {
  if (arr1.length !== arr2.length) {
    return false;
  } else {
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) {
        return false;
      } else {
        continue;
      }
    }
  }
  return true;
};

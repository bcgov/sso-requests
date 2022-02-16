import { isObject, omit, sortBy, compact } from 'lodash';
import { Op } from 'sequelize';
import { verify, sign } from 'jsonwebtoken';
import { diff } from 'deep-diff';
import validate from 'react-jsonschema-form/lib/validate';
import { Request } from '@app/interfaces/Request';
import providerSchema from '@app/schemas/shared/providers';
import requesterSchema from '@app/schemas/shared/requester-info';
import termsAndConditionsSchema from '@app/schemas/shared/terms-and-conditions';
import { customValidate } from '@app/utils/customValidate';
import { Session, Data, User } from '../../../shared/interfaces';
import { renderTemplate, EmailTemplate } from '../../../shared/templates';
import { sendEmail } from '../../../shared/utils/ches';
import { sequelize, models } from '../../../shared/sequelize/models/models';

export const errorMessage = 'No changes submitted. Please change your details to update your integration.';
export const IDIM_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';
const VERIFY_USER_SECRET = process.env.VERIFY_USER_SECRET || 'asdf';

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

export const notifyIdim = async (request: Data, bceidEvent: BceidEvent) => {
  const { realm, id, preferredEmail, additionalEmails, environments } = request;
  const skipNotification = !usesBceid(realm) || bceidEvent === 'update';
  if (skipNotification) return;

  const usesProd = environments.includes('prod');
  // Only cc user for production requests
  let cc = usesProd ? [preferredEmail] : [];
  if (Array.isArray(additionalEmails) && usesProd) cc = cc.concat(additionalEmails);

  let emailCode: EmailTemplate;
  if (bceidEvent === 'submission' && !usesProd) emailCode = 'bceid-idim-dev-submitted';
  else if (bceidEvent === 'deletion') emailCode = 'bceid-idim-deleted';
  else return;
  // const to = APP_ENV === 'production' ? [IDIM_EMAIL_ADDRESS, 'IDIM.Consulting@gov.bc.ca'] : [IDIM_EMAIL_ADDRESS];
  const to = [IDIM_EMAIL_ADDRESS];
  return sendEmail({
    to,
    cc,
    ...renderTemplate(emailCode, { request }),
    event: { emailCode, requestId: id },
  });
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
  const immutableFields = ['idirUserid', 'clientName', 'projectLead', 'status'];
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
}) => {
  const where: any = {};
  const { searchField, searchKey, status = [], archiveStatus = [], realms, environments } = data;

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
  return Promise.all(
    users.map((user) => {
      const invitationLink = generateInvitationToken(user, teamId);
      const { idirEmail } = user;
      const args = {
        to: [idirEmail],
        ...renderTemplate('team-invitation', { teamId, invitationLink }),
      };
      return sendEmail(args);
    }),
  );
}

function generateInvitationToken(user: User, teamId: number) {
  return sign({ userId: user.id, teamId }, VERIFY_USER_SECRET, { expiresIn: '2d' });
}

export async function parseInvitationToken(token) {
  const data = (verify(token, VERIFY_USER_SECRET) as any) || {};
  return [data, null];
}

export const getWhereClauseForRequest = (session: Session, user: User, requestId: number) => {
  const where: any = { id: requestId };
  const { idirUserid } = user;
  const userIsAdmin = isAdmin(session);
  if (!userIsAdmin) {
    where[Op.or] = [
      {
        idirUserid,
      },
      {
        teamId: {
          [Op.in]: sequelize.literal(
            `(select team_id from users_teams where user_id='${user.id}' and pending = false)`,
          ),
        },
      },
    ];
  }
  return where;
};

export const getWhereClauseForRequests = (user: User) => {
  const { idirUserid } = user;
  return {
    [Op.or]: [
      {
        idirUserid,
      },
      {
        teamId: {
          [Op.in]: sequelize.literal(
            `(select team_id from users_teams where user_id='${user.id}' and pending = false )`,
          ),
        },
      },
    ],
  };
};

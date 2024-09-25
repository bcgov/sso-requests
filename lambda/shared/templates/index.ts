import * as fs from 'fs';
import Handlebars = require('handlebars');
import noop from 'lodash.noop';
import { models } from '@lambda-shared/sequelize/models/models';
import { EVENTS, EMAILS } from '@lambda-shared/enums';
import prodApproved from './prod-approved';
import createIntegrationApplied from './create-integration-applied';
import createIntegrationSubmitted from './create-integration-submitted';
import deleteIntegrationSubmitted from './delete-integration-submitted';
import requestLimitExceeded from './request-limit-exceeded';
import teamDeleted from './team-deleted';
import teamInvitation from './team-invitation';
import teamMemberDeletedAdmins from './team-member-deleted-admins';
import teamMemberDeletedUserRemoved from './team-member-deleted-user-removed';
import updateIntegrationApplied from './update-integration-applied';
import updateIntegrationSubmitted from './update-integration-submitted';
import createTeamApiAccountSubmitted from './create-team-api-account-submitted';
import createTeamApiAccountApproved from './create-team-api-account-approved';
import deleteTeamApiAccountSubmitted from './delete-team-api-account-submitted';
import deleteInactiveIdirUsers from './delete-inactive-idir-users';
import surveyCompleted from './survey-completed-notification';
import restoreIntegration from './restore-integration';
import restoreTeamApiAccount from './restore-team-api-account';
import orphanIntegration from './orphan-integration';
import { isNonProdDigitalCredentialRequest } from './helpers';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8080/app';
const APP_ENV = process.env.APP_ENV || 'development';
const readTemplate = (templateKey) => fs.readFileSync(__dirname + `/${templateKey}.html`, 'utf8');
const footer = readTemplate('footer');
const hr = readTemplate('hr');
const createBceidBottom = readTemplate('create-bceid-bottom');
const createGithubBottom = readTemplate('create-github-bottom');
const createDigitalCredentialBottom = readTemplate('create-verified-credential-bottom');
const createBcServicesCardBottom = readTemplate('create-bc-services-card-bottom');
const applyBceidBottom = readTemplate('apply-bceid-bottom');
const applyBcServicesCardBottom = readTemplate('apply-bc-services-card-bottom');
const applyGithubBottom = readTemplate('apply-github-bottom');
const integrationDetail = readTemplate('integration-detail');
const dashboardLogin = readTemplate('dashboard-login');
const processingTime = readTemplate('processing-time');
const ssoUpdatesMailingListMessage = readTemplate('sso-updates-mailing-list-message');
const bceidWarning = readTemplate('bceid-warning');
const digitalCredentialInfoContact = readTemplate('digital-credential-info-contact');

const formatPrimaryUsers = (primaryUsers: string[], otherDetails: string): string | undefined => {
  if (!primaryUsers?.length) {
    return 'None Selected';
  }
  return primaryUsers
    ?.map((user) => {
      switch (user) {
        case 'livingInBC':
          return 'People living in BC';
        case 'businessInBC':
          return 'People doing business/travel in BC';
        case 'bcGovEmployees':
          return 'BC Gov Employees';
        case 'other':
          return `Other: ${otherDetails ?? ''}`;
        default:
          return '';
      }
    })
    .join(', ');
};

const getRolePrivelege = (role: string) => {
  if (role === 'member') return 'view';
  if (role === 'admin') return 'manage';
  return 'view';
};

const capitalize = (word: string) => word[0].toUpperCase() + word.slice(1).toLowerCase();

Handlebars.registerPartial('footer', footer);
Handlebars.registerPartial('hr', hr);
Handlebars.registerPartial('createBceidBottom', createBceidBottom);
Handlebars.registerPartial('createGithubBottom', createGithubBottom);
Handlebars.registerPartial('createDigitalCredentialBottom', createDigitalCredentialBottom);
Handlebars.registerPartial('createBcServicesCardBottom', createBcServicesCardBottom);
Handlebars.registerPartial('applyBceidBottom', applyBceidBottom);
Handlebars.registerPartial('applyGithubBottom', applyGithubBottom);
Handlebars.registerPartial('applyBcServicesCardBottom', applyBcServicesCardBottom);
Handlebars.registerPartial('integrationDetail', integrationDetail);
Handlebars.registerPartial('dashboardLogin', dashboardLogin);
Handlebars.registerPartial('processingTime', processingTime);
Handlebars.registerPartial('ssoUpdatesMailingListMessage', ssoUpdatesMailingListMessage);
Handlebars.registerPartial('bceidWarning', bceidWarning);
Handlebars.registerPartial('digitalCredentialInfoContact', digitalCredentialInfoContact);
Handlebars.registerHelper('formatPrimaryUsers', formatPrimaryUsers);
Handlebars.registerHelper('getRolePrivelege', getRolePrivelege);
Handlebars.registerHelper('capitalize', capitalize);
Handlebars.registerHelper('isNonProdDigitalCredentialRequest', isNonProdDigitalCredentialRequest);

const getBuilder = (key: string) => {
  let builder = { render: (v) => v, send: noop };

  switch (key) {
    case EMAILS.PROD_APPROVED:
      builder = prodApproved;
      break;
    case EMAILS.CREATE_INTEGRATION_APPLIED:
      builder = createIntegrationApplied;
      break;
    case EMAILS.CREATE_INTEGRATION_SUBMITTED:
      builder = createIntegrationSubmitted;
      break;
    case EMAILS.DELETE_INTEGRATION_SUBMITTED:
      builder = deleteIntegrationSubmitted;
      break;
    case EMAILS.TEAM_DELETED:
      builder = teamDeleted;
      break;
    case EMAILS.REQUEST_LIMIT_EXCEEDED:
      builder = requestLimitExceeded;
      break;
    case EMAILS.TEAM_INVITATION:
      builder = teamInvitation;
      break;
    case EMAILS.TEAM_MEMBER_DELETED_ADMINS:
      builder = teamMemberDeletedAdmins;
      break;
    case EMAILS.TEAM_MEMBER_DELETED_USER_REMOVED:
      builder = teamMemberDeletedUserRemoved;
      break;
    case EMAILS.UPDATE_INTEGRATION_APPLIED:
      builder = updateIntegrationApplied;
      break;
    case EMAILS.UPDATE_INTEGRATION_SUBMITTED:
      builder = updateIntegrationSubmitted;
      break;
    case EMAILS.CREATE_TEAM_API_ACCOUNT_SUBMITTED:
      builder = createTeamApiAccountSubmitted;
      break;
    case EMAILS.CREATE_TEAM_API_ACCOUNT_APPROVED:
      builder = createTeamApiAccountApproved;
      break;
    case EMAILS.DELETE_TEAM_API_ACCOUNT_SUBMITTED:
      builder = deleteTeamApiAccountSubmitted;
      break;
    case EMAILS.DELETE_INACTIVE_IDIR_USER:
      builder = deleteInactiveIdirUsers;
      break;
    case EMAILS.SURVEY_COMPLETED:
      builder = surveyCompleted;
      break;
    case EMAILS.RESTORE_INTEGRATION:
      builder = restoreIntegration;
      break;
    case EMAILS.RESTORE_TEAM_API_ACCOUNT:
      builder = restoreTeamApiAccount;
      break;
    case EMAILS.ORPHAN_INTEGRATION:
      builder = orphanIntegration;
      break;
    default:
      break;
  }

  return builder;
};

export interface RenderResult {
  code?: string;
  subject: string;
  body: string;
}

export const renderTemplate = async (code: string, data: any): Promise<RenderResult> => {
  data.appUrl = APP_URL;
  data.apiUrl = API_URL;
  const prefix = APP_ENV === 'production' ? '' : '[DEV] ';
  const builder = getBuilder(code);
  const result = await builder.render(data);

  if (prefix) result.subject = `${prefix}${result.subject}`;
  result.code = code;
  return result;
};

const createEvent = async (data) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.log(err);
  }
};

export const sendTemplate = async (code: string, data: any) => {
  try {
    const builder = getBuilder(code);
    const rendered = await renderTemplate(code, data);

    await builder.send(data, rendered);
  } catch (err) {
    console.error(code, data);
    console.error(err);

    if (data.integration) {
      createEvent({
        eventCode: EVENTS.EMAIL_SUBMISSION_FAILURE,
        requestId: data.integration.id,
        details: { emailCode: code, error: err.message || err },
      });
    }
  }
};

export const sendTemplates = async (emails: { code: string; data: any }[]) => {
  await emails.map((email) => sendTemplate(email.code, email.data));
};

export default { renderTemplate, sendTemplate };

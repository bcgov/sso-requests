import * as fs from 'fs';
import Handlebars from 'handlebars';
import noop from 'lodash.noop';
import { models } from '@app/shared/sequelize/models/models';
import { EVENTS, EMAILS } from '@app/shared/enums';
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
import removeInactiveIdirUserFromTeam from './remove-inactive-idir-user-from-team';
import surveyCompleted from './survey-completed-notification';
import restoreIntegration from './restore-integration';
import restoreTeamApiAccount from './restore-team-api-account';
import orphanIntegration from './orphan-integration';
import { getEmailTemplate, isNonProdDigitalCredentialRequest } from './helpers';
import disableBcscIdp from './disable-bcsc-idp';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8080/app';
const APP_ENV = process.env.APP_ENV || 'development';
const footer = getEmailTemplate('footer.html');
const hr = getEmailTemplate('hr.html');
const createBceidBottom = getEmailTemplate('create-bceid-bottom.html');
const createGithubBottom = getEmailTemplate('create-github-bottom.html');
const createOTPBottom = getEmailTemplate('create-otp-bottom.html');
const createDigitalCredentialBottom = getEmailTemplate('create-verified-credential-bottom.html');
const createBcServicesCardBottom = getEmailTemplate('create-bc-services-card-bottom.html');
const createSocialBottom = getEmailTemplate('create-social-bottom.html');
const applyBceidBottom = getEmailTemplate('apply-bceid-bottom.html');
const applyBcServicesCardBottom = getEmailTemplate('apply-bc-services-card-bottom.html');
const applyGithubBottom = getEmailTemplate('apply-github-bottom.html');
const applyOTPBottom = getEmailTemplate('apply-otp-bottom.html');
const applySocialBottom = getEmailTemplate('apply-social-bottom.html');
const integrationDetail = getEmailTemplate('integration-detail.html');
const bcscClientDetail = getEmailTemplate('bcsc-client-detail.html');
const dashboardLogin = getEmailTemplate('dashboard-login.html');
const processingTime = getEmailTemplate('processing-time.html');
const ssoUpdatesMailingListMessage = getEmailTemplate('sso-updates-mailing-list-message.html');
const bceidWarning = getEmailTemplate('bceid-warning.html');
const digitalCredentialInfoContact = getEmailTemplate('digital-credential-info-contact.html');

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
Handlebars.registerPartial('createOTPBottom', createOTPBottom);
Handlebars.registerPartial('createDigitalCredentialBottom', createDigitalCredentialBottom);
Handlebars.registerPartial('createBcServicesCardBottom', createBcServicesCardBottom);
Handlebars.registerPartial('createSocialBottom', createSocialBottom);
Handlebars.registerPartial('applyBceidBottom', applyBceidBottom);
Handlebars.registerPartial('applyGithubBottom', applyGithubBottom);
Handlebars.registerPartial('applyOTPBottom', applyOTPBottom);
Handlebars.registerPartial('applySocialBottom', applySocialBottom);
Handlebars.registerPartial('applyBcServicesCardBottom', applyBcServicesCardBottom);
Handlebars.registerPartial('integrationDetail', integrationDetail);
Handlebars.registerPartial('bcscClientDetail', bcscClientDetail);
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
  let builder = { render: (v: any) => v, send: noop };

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
    case EMAILS.REMOVE_INACTIVE_IDIR_USER_FROM_TEAM:
      builder = removeInactiveIdirUserFromTeam;
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
    case EMAILS.DISABLE_BCSC_IDP:
      builder = disableBcscIdp;
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

const createEvent = async (data: any) => {
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
        details: { emailCode: code, error: (err as any).message || err },
      });
    }
  }
};

export const sendTemplates = async (emails: { code: string; data: any }[]) => {
  await emails.map((email) => sendTemplate(email.code, email.data));
};

export default { renderTemplate, sendTemplate };

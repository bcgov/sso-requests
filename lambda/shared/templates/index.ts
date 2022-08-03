import * as fs from 'fs';
import Handlebars = require('handlebars');
import { noop } from 'lodash';
import { models } from '@lambda-shared/sequelize/models/models';
import { EVENTS, EMAILS } from '@lambda-shared/enums';
import bceidProdApproved from './bceid-prod-approved';
import createIntegrationApproved from './create-integration-approved';
import createIntegrationSubmitted from './create-integration-submitted';
import createIntegrationSubmittedBceidNonprodIdim from './create-integration-submitted-bceid-nonprod-idim';
import createIntegrationSubmittedBceidProd from './create-integration-submitted-bceid-prod';
import deleteIntegrationSubmitted from './delete-integration-submitted';
import deleteIntegrationSubmittedBceid from './delete-integration-submitted-bceid';
import requestLimitExceeded from './request-limit-exceeded';
import teamDeleted from './team-deleted';
import teamInvitation from './team-invitation';
import teamMemberDeletedAdmins from './team-member-deleted-admins';
import teamMemberDeletedUserRemoved from './team-member-deleted-user-removed';
import updateIntegrationApproved from './update-integration-approved';
import updateIntegrationSubmitted from './update-integration-submitted';
import createTeamApiAccountSubmitted from './create-team-api-account-approved';
import createTeamApiAccountApproved from './create-team-api-account-approved';
import deleteTeamApiAccountSubmitted from './delete-team-api-account-submitted';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8080/app';
const APP_ENV = process.env.APP_ENV || 'development';
const footer = fs.readFileSync(__dirname + '/footer.html', 'utf8');

Handlebars.registerPartial('footer', footer);

const getBuilder = (key: string) => {
  let builder = { render: noop, send: noop };

  switch (key) {
    case EMAILS.BCEID_PROD_APPROVED:
      builder = bceidProdApproved;
      break;
    case EMAILS.CREATE_INTEGRATION_APPROVED:
      builder = createIntegrationApproved;
      break;
    case EMAILS.CREATE_INTEGRATION_SUBMITTED:
      builder = createIntegrationSubmitted;
      break;
    case EMAILS.CREATE_INTEGRATION_SUBMITTED_BCEID_NONPROD_IDIM:
      builder = createIntegrationSubmittedBceidNonprodIdim;
      break;
    case EMAILS.CREATE_INTEGRATION_SUBMITTED_BCEID_PROD:
      builder = createIntegrationSubmittedBceidProd;
      break;
    case EMAILS.DELETE_INTEGRATION_SUBMITTED:
      builder = deleteIntegrationSubmitted;
      break;
    case EMAILS.DELETE_INTEGRATION_SUBMITTED_BCEID:
      builder = deleteIntegrationSubmittedBceid;
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
    case EMAILS.UPDATE_INTEGRATION_APPROVED:
      builder = updateIntegrationApproved;
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
    console.error(err);
  }
};

export const sendTemplate = async (code: string, data: any) => {
  try {
    const builder = getBuilder(code);
    const rendered = await renderTemplate(code, data);
    await builder.send(data, rendered);
  } catch (err) {
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

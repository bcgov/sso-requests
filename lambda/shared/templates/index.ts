import * as fs from 'fs';
import Handlebars = require('handlebars');
import { noop } from 'lodash';
import { EMAILS } from '../../shared/enums';
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
    default:
      break;
  }

  return builder;
};

export const renderTemplate = (code: string, data: any) => {
  data.appUrl = APP_URL;
  data.apiUrl = API_URL;

  const prefix = APP_ENV === 'development' ? '[DEV] ' : '';
  const builder = getBuilder(code);
  const result = builder.render(data);

  if (prefix) result.subject = `${prefix}${result.subject}`;
  return result;
};

export const sendTemplate = (code: string, data: any) => {
  const builder = getBuilder(code);
  return builder.send(data);
};

export default { renderTemplate, sendTemplate };

import fs from 'fs';
import Handlebars from 'handlebars';
import bceidIdimDeleted from './bceid-idim-deleted';
import bceidIdimDevSubmitted from './bceid-idim-dev-submitted';
import bceidRequestApproved from './bceid-request-approved';
import bceidUserProdSubmitted from './bceid-user-prod-submitted';
import createRequestApproved from './create-request-approved';
import createRequestSubmitted from './create-request-submitted';
import requestDeleted from './request-deleted';
import requestDeletedNotificationToAdmin from './request-deleted-notification-to-admin';
import requestLimitExceeded from './request-limit-exceeded';
import teamInvitation from './team-invitation';
import uriChangeRequestApproved from './uri-change-request-approved';
import uriChangeRequestSubmitted from './uri-change-request-submitted';

export type EmailTemplate =
  | 'bceid-idim-deleted'
  | 'bceid-idim-dev-submitted'
  | 'bceid-request-approved'
  | 'bceid-user-prod-submitted'
  | 'create-request-approved'
  | 'create-request-submitted'
  | 'request-deleted'
  | 'request-deleted-notification-to-admin'
  | 'request-limit-exceeded'
  | 'team-invitation'
  | 'uri-change-request-approved'
  | 'uri-change-request-submitted';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8080/api';
const APP_ENV = process.env.APP_ENV || 'development';
const footer = fs.readFileSync(__dirname + '/footer.html', 'utf8');

Handlebars.registerPartial('footer', footer);

export const renderTemplate = (key: EmailTemplate, data: any) => {
  data.appUrl = APP_URL;
  data.apiUrl = API_URL;

  const prefix = APP_ENV === 'development' ? '[DEV] ' : '';
  let result = { subject: '', body: '' };
  switch (key) {
    case 'bceid-idim-deleted':
      result = bceidIdimDeleted.render(data);
      break;
    case 'bceid-idim-dev-submitted':
      result = bceidIdimDevSubmitted.render(data);
      break;
    case 'bceid-request-approved':
      result = bceidRequestApproved.render(data);
      break;
    case 'bceid-user-prod-submitted':
      result = bceidUserProdSubmitted.render(data);
      break;
    case 'create-request-approved':
      result = createRequestApproved.render(data);
      break;
    case 'create-request-submitted':
      result = createRequestSubmitted.render(data);
      break;
    case 'request-deleted':
      result = requestDeleted.render(data);
      break;
    case 'request-deleted-notification-to-admin':
      result = requestDeletedNotificationToAdmin.render(data);
      break;
    case 'request-limit-exceeded':
      result = requestLimitExceeded.render(data);
      break;
    case 'team-invitation':
      result = teamInvitation.render(data);
      break;
    case 'uri-change-request-approved':
      result = uriChangeRequestApproved.render(data);
      break;
    case 'uri-change-request-submitted':
      result = uriChangeRequestSubmitted.render(data);
      break;
    default:
      break;
  }

  if (prefix) result.subject = `${prefix}${result.subject}`;
  return result;
};

export default { renderTemplate };

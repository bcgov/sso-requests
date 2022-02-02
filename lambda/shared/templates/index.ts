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

const footer = fs.readFileSync(__dirname + '/footer.html', 'utf8');

Handlebars.registerPartial('footer', footer);

export const renderTemplate = (key: string, data: any) => {
  switch (key) {
    case 'bceid-idim-deleted':
      return bceidIdimDeleted.render(data);
    case 'bceid-idim-dev-submitted':
      return bceidIdimDevSubmitted.render(data);
    case 'bceid-request-approved':
      return bceidRequestApproved.render(data);
    case 'bceid-user-prod-submitted':
      return bceidUserProdSubmitted.render(data);
    case 'create-request-approved':
      return createRequestApproved.render(data);
    case 'create-request-submitted':
      return createRequestSubmitted.render(data);
    case 'request-deleted':
      return requestDeleted.render(data);
    case 'request-deleted-notification-to-admin':
      return requestDeletedNotificationToAdmin.render(data);
    case 'request-limit-exceeded':
      return requestLimitExceeded.render(data);
    case 'team-invitation':
      return teamInvitation.render(data);
    case 'uri-change-request-approved':
      return uriChangeRequestApproved.render(data);
    case 'uri-change-request-submitted':
      return uriChangeRequestSubmitted.render(data);
    default:
      return { subject: '', body: '' };
  }
};

export default { renderTemplate };

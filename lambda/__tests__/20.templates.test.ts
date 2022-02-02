import { renderTemplate } from '../shared/templates';
import { formDataDev, formDataProd } from './fixtures';

const appUrl = 'https://mysite.com';
const apiUrl = 'https://mysite.com/api';

// import bceidIdimDevSubmitted from './bceid-idim-dev-submitted';
// import bceidRequestApproved from './bceid-request-approved';
// import bceidUserProdSubmitted from './bceid-user-prod-submitted';
// import createRequestApproved from './create-request-approved';
// import createRequestSubmitted from './create-request-submitted';
// import requestDeleted from './request-deleted';
// import requestDeletedNotificationToAdmin from './request-deleted-notification-to-admin';
// import requestLimitExceeded from './request-limit-exceeded';
// import teamInvitation from './team-invitation';
// import uriChangeRequestApproved from './uri-change-request-approved';
// import uriChangeRequestSubmitted from './uri-change-request-submitted';

describe('Email template snapshots', () => {
  it('Should return the expeted email for IDIM deletions', () => {
    const rendered = renderTemplate('bceid-idim-deleted', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for created requests', () => {
    const rendered = renderTemplate('bceid-idim-dev-submitted', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  // it('Should return the expeted email for approved', () => {
  //   expect(getEmailBody('create-request-approved', formDataDev)).toMatchSnapshot();
  // });
  // it('Should return the expeted email for updated submissions', () => {
  //   expect(getEmailBody('uri-change-request-submitted', formDataDev)).toMatchSnapshot();
  // });
  // it('Should return the expeted email for updated approvals', () => {
  //   expect(getEmailBody('uri-change-request-approved', formDataDev)).toMatchSnapshot();
  // });
  // it('Should return the expeted email for deletions', () => {
  //   expect(getEmailBody('request-deleted', formDataDev)).toMatchSnapshot();
  // });
  // it('Should return the expeted email for deletions to admins', () => {
  //   expect(getEmailBody('request-deleted-notification-to-admin', formDataDev)).toMatchSnapshot();
  // });
  // it('Should return the expeted email for exceeding the limit', () => {
  //   expect(getEmailBody('request-limit-exceeded', formDataDev)).toMatchSnapshot();
  // });
  // it('Should return the expeted email for Dev IDIM submissions', () => {
  //   expect(getEmailBody('bceid-idim-dev-submitted', formDataDev)).toMatchSnapshot();
  // });
  // it('Should return the expeted email for IDIM deletions', () => {
  //   expect(getEmailBody('bceid-idim-deleted', formDataProd)).toMatchSnapshot();
  // });
  // it('Should return the expeted email for bceid approvals', () => {
  //   expect(getEmailBody('bceid-request-approved', formDataDev)).toMatchSnapshot();
  // });
});

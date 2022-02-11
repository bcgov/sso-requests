import { renderTemplate } from '../shared/templates';
import { formDataDev, formDataProd } from './fixtures';

describe('Email template snapshots', () => {
  it('Should return the expeted email for IDIM deletions', () => {
    const rendered = renderTemplate('bceid-idim-deleted', { request: formDataProd });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for created requests', () => {
    const rendered = renderTemplate('bceid-idim-dev-submitted', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for bceid approvals', () => {
    const rendered = renderTemplate('bceid-request-approved', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for bceid user Prod submissions', () => {
    const rendered = renderTemplate('bceid-user-prod-submitted', { request: formDataProd });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for approved', () => {
    const rendered = renderTemplate('create-request-approved', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for created requests', () => {
    const rendered = renderTemplate('create-request-submitted', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for deletions', () => {
    const rendered = renderTemplate('request-deleted', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for deletions to admins', () => {
    const rendered = renderTemplate('request-deleted-notification-to-admin', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for exceeding the limit', () => {
    const rendered = renderTemplate('request-limit-exceeded', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for team invitations', () => {
    const rendered = renderTemplate('team-invitation', {
      teamId: 1,
      invitationLink: `https://mysite.com/invitation-link`,
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for updated approvals', () => {
    const rendered = renderTemplate('uri-change-request-approved', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for updated submissions', () => {
    const rendered = renderTemplate('uri-change-request-submitted', { request: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });
});

import { renderTemplate } from '@lambda-shared/templates';
import { EMAILS } from '@lambda-shared/enums';
import { formDataDev, formDataProd } from './fixtures';

describe('Email template snapshots', () => {
  it('Should return the expeted email for CREATE_INTEGRATION_SUBMITTED', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_SUBMITTED_BCEID_NONPROD_IDIM', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED_BCEID_NONPROD_IDIM, {
      integration: formDataDev,
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_SUBMITTED_BCEID_PROD', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED_BCEID_PROD, {
      integration: formDataProd,
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_APPROVED', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPROVED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for UPDATE_INTEGRATION_SUBMITTED', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for UPDATE_INTEGRATION_APPROVED', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_APPROVED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for BCEID_PROD_APPROVED', async () => {
    const rendered = await renderTemplate(EMAILS.BCEID_PROD_APPROVED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for DELETE_INTEGRATION_SUBMITTED', async () => {
    const rendered = await renderTemplate(EMAILS.DELETE_INTEGRATION_SUBMITTED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for DELETE_INTEGRATION_SUBMITTED_BCEID', async () => {
    const rendered = await renderTemplate(EMAILS.DELETE_INTEGRATION_SUBMITTED_BCEID, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for TEAM_INVITATION', async () => {
    const rendered = await renderTemplate(EMAILS.TEAM_INVITATION, {
      email: 'teat@bcgov.bc.ca',
      team: { id: 1, name: 'testteam' },
      invitationLink: `https://mysite.com/invitation-link`,
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for TEAM_MEMBER_DELETED_ADMINS', async () => {
    const rendered = await renderTemplate(EMAILS.TEAM_MEMBER_DELETED_ADMINS, {
      user: { id: 1, displayName: 'test user' },
      team: { id: 1, name: 'testteam' },
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for TEAM_MEMBER_DELETED_USER_REMOVED', async () => {
    const rendered = await renderTemplate(EMAILS.TEAM_MEMBER_DELETED_USER_REMOVED, {
      user: { id: 1, displayName: 'test user' },
      team: { id: 1, name: 'testteam' },
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for TEAM_DELETED', async () => {
    const rendered = await renderTemplate(EMAILS.TEAM_DELETED, { team: { id: 1, name: 'testteam' } });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for REQUEST_LIMIT_EXCEEDED', async () => {
    const rendered = await renderTemplate(EMAILS.REQUEST_LIMIT_EXCEEDED, { user: { id: 1, displayName: 'test user' } });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });
});

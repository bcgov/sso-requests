import { renderTemplate } from '@lambda-shared/templates';
import { EMAILS } from '@lambda-shared/enums';
import { formDataDev, formDataDevTest, formDataProd } from './helpers/fixtures';

describe('Email template snapshots', () => {
  it('Should return the expeted email for CREATE_INTEGRATION_SUBMITTED', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: formDataDevTest,
      waitingBceidProdApproval: false,
      waitingGithubProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_SUBMITTED w/ BCeID', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_SUBMITTED w/ GitHub', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: false,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_SUBMITTED w/ BCeID & GitHub', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_SUBMITTED - no browser login', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: { ...formDataProd, authType: 'service-account' },
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_APPLIED', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_APPLIED - no browser login', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
      integration: { ...formDataDev, authType: 'service-account' },
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_APPLIED - w/ unapproved BCeID prod', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
      integration: { ...formDataDev },
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_APPLIED - w/ unapproved GitHub prod', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
      integration: { ...formDataDev },
      waitingBceidProdApproval: false,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for CREATE_INTEGRATION_APPLIED - w/ unapproved BCeID & GitHub prod', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
      integration: { ...formDataDev },
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for UPDATE_INTEGRATION_SUBMITTED', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
      integration: formDataDevTest,
      waitingBceidProdApproval: false,
      waitingGithubProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for UPDATE_INTEGRATION_SUBMITTED w/ BCeID', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for UPDATE_INTEGRATION_SUBMITTED w/ GitHub', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: false,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for UPDATE_INTEGRATION_SUBMITTED w/ BCeID & GitHub', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for UPDATE_INTEGRATION_APPLIED', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_APPLIED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for PROD_APPROVED w/ BCeID', async () => {
    const rendered = await renderTemplate(EMAILS.PROD_APPROVED, { integration: formDataDev, type: 'BCeID' });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for PROD_APPROVED w/ GitHub', async () => {
    const rendered = await renderTemplate(EMAILS.PROD_APPROVED, { integration: formDataDev, type: 'GitHub' });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expeted email for DELETE_INTEGRATION_SUBMITTED', async () => {
    const rendered = await renderTemplate(EMAILS.DELETE_INTEGRATION_SUBMITTED, { integration: formDataDev });
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

  it('Should return the expeted email for DELETE_INACTIVE_IDIR_USER', async () => {
    const rendered = await renderTemplate(EMAILS.DELETE_INACTIVE_IDIR_USER, {
      teamId: 1,
      username: 'test-user',
      clientId: 'test-client',
      roles: 'test-role',
      teamAdmin: true,
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });
});

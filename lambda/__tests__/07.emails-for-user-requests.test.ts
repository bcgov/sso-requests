import {
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  getUpdateIntegrationData,
  SSO_ADMIN_USERID_01,
  SSO_ADMIN_EMAIL_01,
} from './helpers/fixtures';
import { deleteIntegration, updateIntegration } from './helpers/modules/integrations';
import { cleanUpDatabaseTables, createMockAuth, createMockSendEmail } from './helpers/utils';
import { Integration } from 'app/interfaces/Request';
import { renderTemplate } from '@lambda-shared/templates';
import { EMAILS } from '@lambda-shared/enums';
import { IDIM_EMAIL_ADDRESS, SSO_EMAIL_ADDRESS } from '@lambda-shared/local';
import { applyIntegration, buildIntegration } from './helpers/modules/common';

jest.mock('../app/src/authenticate');

jest.mock('../actions/src/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve(true);
    }),
  };
});

jest.mock('../app/src/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
    closeOpenPullRequests: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('../actions/src/github', () => {
  return {
    mergePR: jest.fn(),
  };
});

jest.mock('@lambda-shared/utils/ches');

jest.mock('../app/src/keycloak/client', () => {
  return {
    disableIntegration: jest.fn(() => Promise.resolve()),
    fetchClient: jest.fn(() => Promise.resolve()),
  };
});

describe('integration email updates for individual users', () => {
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });

    let integration: Integration;

    let emailList;

    it('should render the expected template after submission of non-bceid integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      emailList = createMockSendEmail();
      const projectName: string = 'Non BCeID Submit';
      const integrationRes = await buildIntegration({ projectName, submitted: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;
      const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
        integration,
        waitingBceidProdApproval: false,
        waitingGithubProdApproval: false,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after submission  of bceid integration in non-prod environment', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      emailList = createMockSendEmail();
      const projectName: string = 'BCeID Non Prod Submit';
      const integrationRes = await buildIntegration({ projectName, bceid: true, submitted: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;
      const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
        integration,
        waitingBceidProdApproval: false,
        waitingGithubProdApproval: false,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(2);
      expect(emailList[0].cc.sort()).toEqual([SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS].sort());
    });

    it('should render the expected template after submission of bceid integration in prod environment', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      emailList = createMockSendEmail();
      const projectName: string = 'BCeID Prod Submit';
      const integrationRes = await buildIntegration({ projectName, bceid: true, prodEnv: true, submitted: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;
      const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
        integration,
        waitingBceidProdApproval: true,
        waitingGithubProdApproval: false,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(2);
      expect(emailList[0].cc.sort()).toEqual([SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS].sort());
    });

    it('should render the expected template after approval of an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'Non BCeID Apply';
      let integrationRes = await buildIntegration({ projectName, submitted: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      emailList = createMockSendEmail();

      integrationRes = await applyIntegration({ integrationId: integration.id, planned: true, applied: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
        integration,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after approval of an integration - service account', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'Service Account Apply';
      let integrationRes = await buildIntegration({
        projectName,
        authType: 'service-account',
        submitted: true,
        planned: false,
        applied: false,
      });
      expect(integrationRes.status).toEqual(200);
      let integration = integrationRes.body;

      emailList = createMockSendEmail();

      integrationRes = await applyIntegration({ integrationId: integration.id, planned: true, applied: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
        integration,
        authType: 'service-account',
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after submitting approved bceid integration in non prod', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'BCeID Non Prod Re-Submit';
      let integrationRes = await buildIntegration({
        projectName,
        bceid: true,
        submitted: true,
        planned: true,
        applied: true,
      });
      expect(integrationRes.status).toEqual(200);
      let integration = integrationRes.body;

      emailList = createMockSendEmail();

      const updateIntRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          identityProviders: integration.devIdps,
        }),
        true,
      );

      expect(updateIntRes.status).toEqual(200);
      integration = updateIntRes.body;

      const template = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
        integration,
        waitingBceidProdApproval: false,
        waitingGithubProdApproval: false,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(2);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after submitting approved bceid integration in prod', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'BCeID Prod Re-Submit';
      let integrationRes = await buildIntegration({
        projectName,
        bceid: true,
        prodEnv: true,
        submitted: true,
        planned: true,
        applied: true,
      });
      expect(integrationRes.status).toEqual(200);
      let integration = integrationRes.body;

      emailList = createMockSendEmail();

      const updateIntRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          identityProviders: integration.devIdps,
          envs: ['dev', 'test', 'prod'],
        }),
        true,
      );

      expect(updateIntRes.status).toEqual(200);
      integration = updateIntRes.body;

      const template = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
        integration,
        waitingBceidProdApproval: true,
        waitingGithubProdApproval: false,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(2);
      expect(emailList[0].cc.sort()).toEqual([SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS].sort());
    });

    it('should render the expected template after applying approved bceid integration in non prod', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'BCeID Non Prod Re-Apply';
      let integrationRes = await buildIntegration({
        projectName,
        bceid: true,
        submitted: true,
        planned: true,
        applied: true,
      });
      expect(integrationRes.status).toEqual(200);
      let integration = integrationRes.body;

      const updateIntRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          identityProviders: integration.devIdps,
          envs: integration.environments,
        }),
        true,
      );
      expect(updateIntRes.status).toEqual(200);
      integration = updateIntRes.body;

      emailList = createMockSendEmail();

      integrationRes = await applyIntegration({ integrationId: integration.id, planned: true, applied: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      const template = await renderTemplate(EMAILS.UPDATE_INTEGRATION_APPLIED, {
        integration,
        hasBceid: true,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after applying non prod approved bceid integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'BCeID Prod Re-Apply Unapproved';
      let integrationRes = await buildIntegration({
        projectName,
        bceid: true,
        prodEnv: true,
        submitted: true,
        planned: true,
        applied: true,
      });
      expect(integrationRes.status).toEqual(200);
      let integration = integrationRes.body;

      const updateIntRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          projectName: 'BCeID Prod Re-Apply Unapproved1',
          identityProviders: integration.devIdps,
          envs: integration.environments,
        }),
        true,
      );
      expect(updateIntRes.status).toEqual(200);
      integration = updateIntRes.body;

      emailList = createMockSendEmail();

      integrationRes = await applyIntegration({ integrationId: integration.id, planned: true, applied: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      const template = await renderTemplate(EMAILS.UPDATE_INTEGRATION_APPLIED, {
        integration,
        hasBceid: true,
        waitingBceidProdApproval: true,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after bceid prod approval of an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'Non BCeID Apply';
      let integrationRes = await buildIntegration({
        projectName,
        bceid: true,
        prodEnv: true,
        submitted: true,
        planned: true,
        applied: true,
      });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      emailList = createMockSendEmail();

      createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);

      const updateIntRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          identityProviders: integration.devIdps,
          envs: integration.environments,
          bceidApproved: true,
        }),
        true,
      );

      expect(updateIntRes.status).toEqual(200);
      integration = updateIntRes.body;

      const template = await renderTemplate(EMAILS.PROD_APPROVED, {
        integration: { ...integration, requestor: 'SSO Admin' },
        type: 'BCeID',
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after github prod approval of an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'Non BCeID Apply';
      let integrationRes = await buildIntegration({
        projectName,
        github: true,
        prodEnv: true,
        submitted: true,
        planned: true,
        applied: true,
      });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      emailList = createMockSendEmail();

      createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);

      const updateIntRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          identityProviders: integration.devIdps,
          envs: integration.environments,
          githubApproved: true,
        }),
        true,
      );

      expect(updateIntRes.status).toEqual(200);
      integration = updateIntRes.body;

      const template = await renderTemplate(EMAILS.PROD_APPROVED, {
        integration: { ...integration, requestor: 'SSO Admin' },
        type: 'GitHub',
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after submission to delete an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'Non BCeID Delete';
      let integrationRes = await buildIntegration({
        projectName,
        submitted: true,
        planned: true,
        applied: true,
      });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      emailList = createMockSendEmail();

      const deleteIntRes = await deleteIntegration(integration.id);
      expect(deleteIntRes.status).toEqual(200);
      integration = deleteIntRes.body;

      const template = await renderTemplate(EMAILS.DELETE_INTEGRATION_SUBMITTED, {
        integration,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after submission to delete bceid integration for prod', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'BCeID Prod Delete';
      let integrationRes = await buildIntegration({
        projectName,
        bceid: true,
        prodEnv: true,
        submitted: true,
        planned: true,
        applied: true,
      });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      emailList = createMockSendEmail();

      const deleteIntRes = await deleteIntegration(integration.id);
      expect(deleteIntRes.status).toEqual(200);
      integration = deleteIntRes.body;

      const template = await renderTemplate(EMAILS.DELETE_INTEGRATION_SUBMITTED, {
        integration,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(2);
      expect(emailList[0].cc.sort()).toEqual([SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS].sort());
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});

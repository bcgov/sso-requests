import {
  SSO_ADMIN_EMAIL_01,
  SSO_ADMIN_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_01,
  getUpdateIntegrationData,
  postTeam,
} from './helpers/fixtures';
import { deleteIntegration, updateIntegration } from './helpers/modules/integrations';
import { createTeam, verifyTeamMember } from './helpers/modules/teams';
import { cleanUpDatabaseTables } from './helpers/utils';
import { Integration } from '@app/interfaces/Request';
import { renderTemplate } from '@app/shared/templates';
import { EMAILS } from '@app/shared/enums';
import { IDIM_EMAIL_ADDRESS, SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { buildIntegration } from './helpers/modules/common';
import { getAuthenticatedUser } from './helpers/modules/users';
import { generateInvitationToken } from '@app/helpers/token';
import { createMockAuth } from './mocks/authenticate';
import { createMockSendEmail } from './mocks/mail';

jest.mock('@app/controllers/bc-services-card', () => {
  return {
    getPrivacyZones: jest.fn(() => Promise.resolve([{ privacy_zone_uri: 'zone1', privacy_zone_name: 'zone1' }])),
    getAttributes: jest.fn(() =>
      Promise.resolve([
        {
          name: 'age',
          scope: 'profile',
        },
        {
          name: 'postal_code',
          scope: 'address',
        },
      ]),
    ),
  };
});

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@app/keycloak/client', () => {
  return {
    disableIntegration: jest.fn(() => Promise.resolve()),
    fetchClient: jest.fn(() => Promise.resolve()),
  };
});

describe('integration email updates for teams', () => {
  try {
    let teamId: number;

    beforeAll(async () => {
      jest.clearAllMocks();
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      emailList = createMockSendEmail();
      const result = await createTeam(postTeam);
      teamId = result.body.id;
      createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
      const userRes = await getAuthenticatedUser();
      const token = generateInvitationToken(userRes.body as any, teamId);
      await verifyTeamMember(token);
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });

    let integration: Integration;

    let emailList: any;

    it('should render the expected template after submission of non-bceid integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      emailList = createMockSendEmail();
      const projectName: string = 'Non BCeID Submit';

      const integrationRes = await buildIntegration({ projectName, teamId, submitted: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
        integration,
        waitingBceidProdApproval: false,
        waitingGithubProdApproval: false,
      });

      expect(emailList.length).toEqual(2);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(2);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after submission of bceid integration in non-prod environment', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      emailList = createMockSendEmail();
      const projectName: string = 'BCeID Non Prod Submit';
      const integrationRes = await buildIntegration({ projectName, teamId, submitted: true, bceid: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
        integration,
        waitingBceidProdApproval: false,
        waitingGithubProdApproval: false,
      });

      expect(emailList.length).toEqual(2);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(2);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc.sort()).toEqual([SSO_EMAIL_ADDRESS].sort());
    });

    it('should render the expected template after submission of bceid integration in prod environment', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      emailList = createMockSendEmail();
      const projectName: string = 'BCeID Prod Submit';
      const integrationRes = await buildIntegration({
        projectName,
        teamId,
        submitted: true,
        bceid: true,
        prodEnv: true,
      });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
        integration,
        waitingBceidProdApproval: true,
        waitingGithubProdApproval: false,
      });

      expect(emailList.length).toEqual(2);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(2);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(2);
      expect(emailList[0].cc.sort()).toEqual([SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS].sort());
    });

    it('should render the expected template after approval of an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'Non BCeID Apply';

      emailList = createMockSendEmail();

      let integrationRes = await buildIntegration({
        projectName,
        teamId,
        submitted: true,
      });
      expect(integrationRes.status).toEqual(200);
      let integration = integrationRes.body;

      const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
        integration,
      });

      expect(emailList.length).toEqual(2);
      expect(emailList[1].subject).toEqual(template.subject);
      expect(emailList[1].body).toEqual(template.body);
      expect(emailList[1].to.length).toEqual(2);
      expect(emailList[1].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[1].cc.length).toEqual(1);
      expect(emailList[1].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after approval of service account', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'Service Account Apply';

      emailList = createMockSendEmail();

      let integrationRes = await buildIntegration({
        projectName,
        teamId,
        authType: 'service-account',
        submitted: true,
        publicAccess: false,
      });
      expect(integrationRes.status).toEqual(200);
      let integration = integrationRes.body;

      const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
        integration,
        authType: 'service-account',
      });

      expect(emailList.length).toEqual(2);
      expect(emailList[1].subject).toEqual(template.subject);
      expect(emailList[1].body).toEqual(template.body);
      expect(emailList[1].to.length).toEqual(2);
      expect(emailList[1].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[1].cc.length).toEqual(1);
      expect(emailList[1].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after submitting approved bceid integration in non prod', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'BCeID Non Prod Re-Submit';
      let integrationRes = await buildIntegration({
        projectName,
        bceid: true,
        teamId,
        submitted: true,
      });
      expect(integrationRes.status).toEqual(200);
      let integration = integrationRes.body;

      emailList = createMockSendEmail();

      let updateIntRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          identityProviders: ['bceidbasic'],
        }),
        true,
      );
      expect(updateIntRes.status).toEqual(200);
      integration = updateIntRes.body;

      const template = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
        integration,
        waitingBceidProdApproval: false,
        waitingGithubProdApproval: false,
        changes: integration.lastChanges,
      });

      expect(emailList.length).toEqual(2);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(2);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after submitting approved bceid integration in prod', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'BCeID Prod Re-Submit';
      let integrationRes = await buildIntegration({
        projectName,
        bceid: true,
        teamId,
        submitted: true,
      });
      expect(integrationRes.status).toEqual(200);
      let integration = integrationRes.body;

      emailList = createMockSendEmail();

      let updateIntRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          identityProviders: ['bceidbasic'],
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
        changes: integration.lastChanges,
      });

      expect(emailList.length).toEqual(2);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(2);
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
        teamId,
        submitted: true,
      });
      expect(integrationRes.status).toEqual(200);
      let integration = integrationRes.body;
      emailList = createMockSendEmail();

      let updateIntRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          identityProviders: ['bceidbasic'],
        }),
        true,
      );
      expect(updateIntRes.status).toEqual(200);
      integration = updateIntRes.body;

      const template = await renderTemplate(EMAILS.UPDATE_INTEGRATION_APPLIED, {
        integration,
        waitingBceidProdApproval: false,
        waitingGithubProdApproval: false,
        hasBceid: true,
      });

      expect(emailList.length).toEqual(2);
      expect(emailList[1].subject).toEqual(template.subject);
      expect(emailList[1].body).toEqual(template.body);
      expect(emailList[1].to.length).toEqual(2);
      expect(emailList[1].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[1].cc.length).toEqual(1);
      expect(emailList[1].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after bceid prod approval of an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'Non BCeID Apply';
      let integrationRes = await buildIntegration({
        projectName,
        bceid: true,
        prodEnv: true,
        submitted: true,
        teamId,
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

      expect(emailList.length).toEqual(2);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(2);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(2);
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
        teamId,
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

      expect(emailList.length).toEqual(2);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(2);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should render the expected template after submission to delete an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'Non BCeID Delete';
      let integrationRes = await buildIntegration({
        projectName,
        teamId,
        submitted: true,
      });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      emailList = createMockSendEmail();

      const deleteIntRes = await deleteIntegration(integration?.id!);
      expect(deleteIntRes.status).toEqual(200);
      integration = deleteIntRes.body;

      const template = await renderTemplate(EMAILS.DELETE_INTEGRATION_SUBMITTED, {
        integration,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(2);
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
        teamId,
        submitted: true,
      });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      emailList = createMockSendEmail();

      const deleteIntRes = await deleteIntegration(integration?.id!);
      expect(deleteIntRes.status).toEqual(200);
      integration = deleteIntRes.body;

      const template = await renderTemplate(EMAILS.DELETE_INTEGRATION_SUBMITTED, {
        integration,
      });

      expect(emailList.length).toEqual(1);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(2);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(2);
      expect(emailList[0].cc.sort()).toEqual([SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS].sort());
    });

    it('should render the expected template after removing bc services card idp from prod integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'Remove BCSC IDP Prod';
      let integrationRes = await buildIntegration({
        projectName,
        bceid: true,
        prodEnv: true,
        submitted: true,
        bcServicesCard: true,
        teamId,
      });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      emailList = createMockSendEmail();

      let updateIntegrationRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          identityProviders: ['azureidir', 'bceidbasic'],
        }),
        true,
      );
      expect(updateIntegrationRes.status).toEqual(200);

      const template = await renderTemplate(EMAILS.DISABLE_BCSC_IDP, {
        integration,
      });

      expect(emailList.length).toEqual(3);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});

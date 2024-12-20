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
import { updateIntegration } from './helpers/modules/integrations';
import { createTeam, verifyTeamMember } from './helpers/modules/teams';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { Integration } from 'app/interfaces/Request';
import { buildIntegration } from './helpers/modules/common';
import { getAuthenticatedUser } from './helpers/modules/users';
import { generateInvitationToken } from '@lambda-app/helpers/token';

jest.mock('../app/src/keycloak/integration', () => {
  const original = jest.requireActual('../app/src/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('../app/src/keycloak/client', () => {
  return {
    disableIntegration: jest.fn(() => Promise.resolve()),
    fetchClient: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('@lambda-app/controllers/bc-services-card', () => {
  return {
    getPrivacyZones: jest.fn(() =>
      Promise.resolve([
        { privacy_zone_uri: 'zone1', privacy_zone_name: 'zone1' },
        { privacy_zone_uri: 'zone2', privacy_zone_name: 'zone2' },
      ]),
    ),
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
        {
          name: 'email',
          scope: 'email',
        },
      ]),
    ),
  };
});

describe('integration validations', () => {
  try {
    let teamId: number;
    let integration: Integration;

    beforeAll(async () => {
      jest.clearAllMocks();
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await createTeam(postTeam);
      teamId = result.body.id;
      createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
      const userRes = await getAuthenticatedUser();
      const token = generateInvitationToken(userRes.body as any, teamId);
      await verifyTeamMember(token);
      const projectName: string = 'Integration Validations';
      const integrationRes = await buildIntegration({ projectName, teamId, submitted: true, prodEnv: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });

    it('should not allow removing a team after integration is applied', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const updateableIntegration = getUpdateIntegrationData({ integration });
      let updateIntRes = await updateIntegration(
        { ...updateableIntegration, usesTeam: false, projectLead: true },
        true,
      );
      expect(updateIntRes.status).toEqual(200);
      expect(updateIntRes.body.usesTeam).toEqual(true);
      expect(updateIntRes.body.projectLead).toEqual(false);
    });

    it('should allow changing the team after the integration is applied', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const newTeam = await createTeam({
        name: 'new team',
        members: [
          {
            idirEmail: TEAM_ADMIN_IDIR_EMAIL_01,
            role: 'admin',
          },
        ],
      });
      const updateableIntegration = getUpdateIntegrationData({ integration: integration });
      let updateIntRes = await updateIntegration({ ...updateableIntegration, teamId: String(newTeam.body.id) }, true);
      expect(updateIntRes.status).toEqual(200);
      expect(updateIntRes.body.usesTeam).toEqual(true);
      expect(updateIntRes.body.projectLead).toEqual(false);
      expect(updateIntRes.body.teamId).toEqual(newTeam.body.id);
    });

    it('should allow adding a team to single-owner integrations after the integration is applied', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const integrationRes = await buildIntegration({ projectName: 'single-owner', submitted: true, prodEnv: true });
      expect(integrationRes.body.usesTeam).toEqual(false);
      expect(integrationRes.body.projectLead).toEqual(true);

      const updateableIntegration = getUpdateIntegrationData({ integration: integrationRes.body });
      let updateIntRes = await updateIntegration(
        { ...updateableIntegration, usesTeam: true, teamId: String(teamId), projectLead: false },
        true,
      );
      expect(updateIntRes.status).toEqual(200);
      expect(updateIntRes.body.usesTeam).toEqual(true);
      expect(updateIntRes.body.projectLead).toEqual(false);
      expect(updateIntRes.body.teamId).toEqual(teamId);
    });

    it('should not allow to change bceid idp and/or approved flag', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'BCeID Integration Validations';
      const integrationRes = await buildIntegration({ projectName, submitted: true, prodEnv: true, bceid: true });
      let bceidIntegration = integrationRes.body;
      createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
      const approvedRes = await updateIntegration(
        { ...getUpdateIntegrationData({ integration: bceidIntegration }), bceidApproved: true },
        true,
      );
      expect(approvedRes.status).toEqual(200);
      bceidIntegration = approvedRes.body;
      const changeBceidIdp = ['idir', 'bceidboth'];
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const changeIdpRes = await updateIntegration(
        {
          ...getUpdateIntegrationData({ integration: bceidIntegration }),
          devIdps: changeBceidIdp,
          testIdps: changeBceidIdp,
          prodIdps: changeBceidIdp,
        },
        true,
      );
      expect(changeIdpRes.status).toEqual(422);
      const addNewIdp = ['idir', 'bceidbasic', 'githubbcgov'];
      const unapproveIdpRes = await updateIntegration(
        {
          ...getUpdateIntegrationData({ integration: bceidIntegration }),
          bceidApproved: false,
          devIdps: addNewIdp,
          testIdps: addNewIdp,
          prodIdps: addNewIdp,
        },
        true,
      );
      expect(unapproveIdpRes.status).toEqual(200);
      expect(unapproveIdpRes.body.bceidApproved).toEqual(true);
      expect(unapproveIdpRes.body.devIdps).toEqual(addNewIdp);
      expect(unapproveIdpRes.body.testIdps).toEqual(addNewIdp);
      expect(unapproveIdpRes.body.prodIdps).toEqual(addNewIdp);
    });

    it('should not allow to change github idp and/or approved flag', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'GitHub Integration Validations';
      const integrationRes = await buildIntegration({ projectName, submitted: true, prodEnv: true, github: true });
      let githubIntegration = integrationRes.body;
      createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
      const approvedRes = await updateIntegration(
        { ...getUpdateIntegrationData({ integration: githubIntegration }), githubApproved: true },
        true,
      );
      expect(approvedRes.status).toEqual(200);
      githubIntegration = approvedRes.body;
      const changeGithubIdp = ['idir', 'githubpublic'];
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const changeIdpRes = await updateIntegration(
        {
          ...getUpdateIntegrationData({ integration: githubIntegration }),
          devIdps: changeGithubIdp,
          testIdps: changeGithubIdp,
          prodIdps: changeGithubIdp,
        },
        true,
      );
      expect(changeIdpRes.status).toEqual(422);
      const addNewIdp = ['idir', 'githubbcgov', 'bceidbasic'];
      const unapproveIdpRes = await updateIntegration(
        {
          ...getUpdateIntegrationData({ integration: githubIntegration }),
          githubApproved: false,
          devIdps: addNewIdp,
          testIdps: addNewIdp,
          prodIdps: addNewIdp,
        },
        true,
      );
      expect(unapproveIdpRes.status).toEqual(200);
      expect(unapproveIdpRes.body.githubApproved).toEqual(true);
      expect(unapproveIdpRes.body.devIdps).toEqual(addNewIdp);
      expect(unapproveIdpRes.body.testIdps).toEqual(addNewIdp);
      expect(unapproveIdpRes.body.prodIdps).toEqual(addNewIdp);
    });

    it('should not allow to change bc services card idp and/or approved flag', async () => {
      process.env.ALLOW_BC_SERVICES_CARD_PROD = 'true';
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const projectName: string = 'BCSC Integration Validations';
      const integrationRes = await buildIntegration({
        projectName,
        submitted: true,
        prodEnv: true,
        bcServicesCard: true,
      });
      let bcServicesCardIntegration = integrationRes.body;

      createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
      const approvedRes = await updateIntegration(
        {
          ...getUpdateIntegrationData({ integration: bcServicesCardIntegration }),
          bcServicesCardApproved: true,
        },
        true,
      );
      expect(approvedRes.status).toEqual(200);
      bcServicesCardIntegration = approvedRes.body;

      expect(approvedRes.body.bcscPrivacyZone).toEqual('zone1'); // unchanged

      const filterBcscIdp = ['idir'];
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const changeIdpRes = await updateIntegration(
        {
          ...getUpdateIntegrationData({ integration: bcServicesCardIntegration }),
          devIdps: filterBcscIdp,
          testIdps: filterBcscIdp,
          prodIdps: filterBcscIdp,
        },
        true,
      );
      expect(changeIdpRes.status).toEqual(422);
      const addNewIdp = ['idir', 'bcservicescard', 'githubbcgov', 'bceidbasic'];
      const unapproveIdpRes = await updateIntegration(
        {
          ...getUpdateIntegrationData({ integration: bcServicesCardIntegration }),
          bcServicesCardApproved: false,
          devIdps: addNewIdp,
          testIdps: addNewIdp,
          prodIdps: addNewIdp,
          bcscPrivacyZone: 'zone2', // changing privacy zone
          bcscAttributes: ['email'], // changing attributes
        },
        true,
      );
      expect(unapproveIdpRes.status).toEqual(200);
      expect(unapproveIdpRes.body.bcServicesCardApproved).toEqual(true); // unchanged
      expect(unapproveIdpRes.body.devIdps).toEqual(addNewIdp); // updated
      expect(unapproveIdpRes.body.testIdps).toEqual(addNewIdp); // updated
      expect(unapproveIdpRes.body.prodIdps).toEqual(addNewIdp); // updated
      expect(unapproveIdpRes.body.bcscPrivacyZone).toEqual('zone1'); // unchanged
      expect(unapproveIdpRes.body.bcscAttributes).toEqual(['age', 'postal_code']); // unchanged
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});

import {
  SSO_ADMIN_EMAIL_01,
  SSO_ADMIN_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_01,
  getCreateIntegrationData,
  getUpdateIntegrationData,
  postTeam,
} from './helpers/fixtures';
import { createIntegration, updateIntegration } from './helpers/modules/integrations';
import { createTeam, verifyTeamMember } from './helpers/modules/teams';
import { cleanUpDatabaseTables } from './helpers/utils';
import { Integration } from '@app/interfaces/Request';
import { buildIntegration } from './helpers/modules/common';
import { getAuthenticatedUser } from './helpers/modules/users';
import { generateInvitationToken } from '@app/helpers/token';
import { models } from '@app/shared/sequelize/models/models';
import { createMockAuth } from './__mocks__/authenticate';

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

jest.mock('@app/controllers/bc-services-card', () => {
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
      const addNewIdp = ['azureidir', 'bceidbasic', 'githubbcgov'];
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
      const changeGithubIdp = ['azureidir', 'githubpublic'];
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
      const addNewIdp = ['azureidir', 'githubbcgov', 'bceidbasic'];
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

      const filterBcscIdp = ['azureidir'];
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
      const addNewIdp = ['azureidir', 'bcservicescard', 'githubbcgov', 'bceidbasic'];
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
      expect(unapproveIdpRes.status).toEqual(422);
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }

  it('should not allow regular users to add a discontinued idp', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    let integrationRes = await createIntegration(
      getCreateIntegrationData({
        projectName: 'IDIR not allowed',
      }),
    );

    expect(integrationRes.status).toEqual(200);
    const integration = integrationRes.body;

    let updateIntegrationRes = await updateIntegration(
      getUpdateIntegrationData({
        integration,
        identityProviders: ['idir', 'azureidir', 'bceidbasic'],
        envs: ['dev', 'test', 'prod'],
      }),
      true,
    );
    expect(updateIntegrationRes.status).toEqual(422);
  });

  it('should allow admin users to add a discontinued idp', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01, ['sso-admin']);
    let integrationRes = await createIntegration(
      getCreateIntegrationData({
        projectName: 'IDIR allowed',
      }),
    );

    expect(integrationRes.status).toEqual(200);
    const integration = integrationRes.body;

    let updateIntegrationRes = await updateIntegration(
      getUpdateIntegrationData({
        integration,
        identityProviders: ['idir', 'azureidir', 'bceidbasic'],
        envs: ['dev', 'test', 'prod'],
      }),
      true,
    );

    expect(updateIntegrationRes.status).toEqual(200);
    expect(updateIntegrationRes.body.devIdps).toEqual(['idir', 'azureidir', 'bceidbasic']);
  });

  it('should preserve discontinued idp for existing integrations', async () => {
    const MOCK_USER_ID = -1;
    const MOCK_USER_EMAIL = 'test@user.com';
    createMockAuth(MOCK_USER_ID.toString(), MOCK_USER_EMAIL);
    await models.user.create({
      id: MOCK_USER_ID,
      idirEmail: MOCK_USER_EMAIL,
    });
    const integration = getUpdateIntegrationData({
      integration: { projectName: 'Preserve IDIR for Existing Int', projectLead: true, usesTeam: false },
      identityProviders: ['idir', 'azureidir'],
    });
    await models.request.create({
      ...integration,
      usesTeam: false,
      userId: MOCK_USER_ID,
    });

    const int = await models.request.findOne(
      { where: { projectName: 'Preserve IDIR for Existing Int' } },
      { raw: true },
    );

    let updateIntegrationRes = await updateIntegration(
      getUpdateIntegrationData({
        integration: { ...int.get({ plain: true }) },
        identityProviders: ['idir', 'azureidir', 'bceidbasic'],
      }),
      true,
    );

    expect(updateIntegrationRes.status).toEqual(200);
    expect(updateIntegrationRes.body.devIdps).toEqual(['idir', 'azureidir', 'bceidbasic']);
  });
});

describe('Approval Resets', () => {
  beforeEach(async () => {
    createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
  });

  describe('Admin', () => {
    it('resets bceid approval status when all bceid idps are removed', async () => {
      let integrationRes = await buildIntegration({
        projectName: 'test',
        bceid: true,
        bceidApproved: true,
      });
      let response = await updateIntegration({ ...integrationRes.body, devIdps: ['azureidir'] }, true);
      expect(response.status).toBe(200);
      expect(response.body.bceidApproved).toBeFalsy();

      integrationRes = await buildIntegration({
        projectName: 'test',
        bceid: true,
        bceidBusiness: true,
        bceidApproved: true,
      });
      response = await updateIntegration({ ...integrationRes.body, devIdps: ['azureidir'] }, true);
      expect(response.status).toBe(200);
      expect(response.body.bceidApproved).toBeFalsy();
    });

    it('preserves bceid approval status when a bceid idp remains', async () => {
      const integrationRes = await buildIntegration({
        projectName: 'test',
        bceid: true,
        bceidBusiness: true,
        bceidApproved: true,
      });
      const response = await updateIntegration({ ...integrationRes.body, devIdps: ['bceidbasic'] }, true);
      expect(response.status).toBe(200);
      expect(response.body.bceidApproved).toBeTruthy();
    });

    it('Removes github approval status when all github Idps are removed', async () => {
      const integrationRes = await buildIntegration({
        projectName: 'test',
        github: true,
        githubApproved: true,
      });
      const response = await updateIntegration({ ...integrationRes.body, devIdps: ['azureidir'] }, true);
      expect(response.status).toBe(200);
      expect(response.body.githubApproved).toBeFalsy();
    });

    it('Keeps github approval status when github Idps remain', async () => {
      const integrationRes = await buildIntegration({
        projectName: 'test',
        github: true,
        githubApproved: true,
      });
      expect(integrationRes.status).toBe(200);
      const response = await updateIntegration({ ...integrationRes.body, devIdps: ['githubbcgov', 'azureidir'] }, true);
      expect(response.status).toBe(200);
      expect(response.body.githubApproved).toBeTruthy();
    });
  });
});

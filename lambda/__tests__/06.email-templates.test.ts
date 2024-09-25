import { renderTemplate } from '@lambda-shared/templates';
import { EMAILS } from '@lambda-shared/enums';
import {
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_01,
  formDataDev,
  formDataDevTest,
  formDataProd,
  postTeam,
} from './helpers/fixtures';
import { generateInvitationToken } from '@lambda-app/helpers/token';
import { createTeam, verifyTeamMember } from './helpers/modules/teams';
import { getAuthenticatedUser } from './helpers/modules/users';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';

const MOCK_PRIVACY_ZONE_URI = 'zone';

jest.mock('@lambda-app/authenticate');

jest.mock('@lambda-shared/utils/ches');

jest.mock('@lambda-shared/templates/helpers', () => {
  const original = jest.requireActual('@lambda-shared/templates/helpers');
  return {
    ...original,
    getAccountableEntity: jest.fn(() => Promise.resolve('username')),
  };
});

jest.mock('@lambda-app/controllers/bc-services-card', () => {
  return {
    getPrivacyZones: jest.fn(() =>
      Promise.resolve([{ privacy_zone_uri: MOCK_PRIVACY_ZONE_URI, privacy_zone_name: 'zone' }]),
    ),
  };
});

describe('Email template snapshots', () => {
  let teamId: number;
  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
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
  it('Should return the expected email for CREATE_INTEGRATION_SUBMITTED', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: formDataDevTest,
      waitingBceidProdApproval: false,
      waitingGithubProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_SUBMITTED w/ BCeID', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_SUBMITTED w/ GitHub', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: false,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_SUBMITTED w/ BCeID & GitHub', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_SUBMITTED - no browser login', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: { ...formDataProd, authType: 'service-account' },
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_APPLIED', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_APPLIED - no browser login', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
      integration: { ...formDataDev, authType: 'service-account' },
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_APPLIED - w/ unapproved BCeID prod', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
      integration: { ...formDataDev },
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_APPLIED - w/ unapproved GitHub prod', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
      integration: { ...formDataDev },
      waitingBceidProdApproval: false,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_APPLIED - w/ unapproved BCeID & GitHub prod', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
      integration: { ...formDataDev },
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_SUBMITTED w/ BC Services Card', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, {
      integration: {
        ...formDataProd,
        devIdps: ['bcservicescard'],
        testIdps: ['bcservicescard'],
        prodIdps: ['bcservicescard'],
        bcscPrivacyZone: MOCK_PRIVACY_ZONE_URI,
      },
      waitingBcServicesCardProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_APPLIED - w/ approved BC Services Card prod', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
      integration: { ...formDataDev, devIdps: ['bcservicescard'], bcscPrivacyZone: MOCK_PRIVACY_ZONE_URI },
      waitingBcServicesCardProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_INTEGRATION_APPLIED - w/ unapproved BC Services Card prod', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_INTEGRATION_APPLIED, {
      integration: { ...formDataDev, devIdps: ['bcservicescard'], bcscPrivacyZone: MOCK_PRIVACY_ZONE_URI },
      waitingBcServicesCardProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for UPDATE_INTEGRATION_SUBMITTED', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
      integration: formDataDevTest,
      waitingBceidProdApproval: false,
      waitingGithubProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for UPDATE_INTEGRATION_SUBMITTED w/ BCeID', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: false,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for UPDATE_INTEGRATION_SUBMITTED w/ GitHub', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: false,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for UPDATE_INTEGRATION_SUBMITTED w/ BCeID & GitHub', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
      integration: formDataProd,
      waitingBceidProdApproval: true,
      waitingGithubProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for UPDATE_INTEGRATION_SUBMITTED w/ unapproved BC Services Card', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_SUBMITTED, {
      integration: {
        ...formDataProd,
        devIdps: ['bcservicescard'],
        testIdps: ['bcservicescard'],
        prodIdps: ['bcservicescard'],
        bcscPrivacyZone: MOCK_PRIVACY_ZONE_URI,
      },
      waitingBcServicesCardProdApproval: true,
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for UPDATE_INTEGRATION_APPLIED', async () => {
    const rendered = await renderTemplate(EMAILS.UPDATE_INTEGRATION_APPLIED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for PROD_APPROVED w/ BCeID', async () => {
    const rendered = await renderTemplate(EMAILS.PROD_APPROVED, { integration: formDataDev, type: 'BCeID' });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for PROD_APPROVED w/ GitHub', async () => {
    const rendered = await renderTemplate(EMAILS.PROD_APPROVED, { integration: formDataDev, type: 'GitHub' });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for PROD_APPROVED w/ BC Services Card', async () => {
    const rendered = await renderTemplate(EMAILS.PROD_APPROVED, {
      integration: { ...formDataDev, devIdps: ['bcservicescard'], bcscPrivacyZone: MOCK_PRIVACY_ZONE_URI },
      type: 'BC Services Card',
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for DELETE_INTEGRATION_SUBMITTED', async () => {
    const rendered = await renderTemplate(EMAILS.DELETE_INTEGRATION_SUBMITTED, { integration: formDataDev });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for TEAM_INVITATION members', async () => {
    const rendered = await renderTemplate(EMAILS.TEAM_INVITATION, {
      email: 'teat@bcgov.bc.ca',
      team: { id: 1, name: 'testteam' },
      invitationLink: `https://mysite.com/invitation-link`,
      role: 'member',
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for TEAM_INVITATION admins', async () => {
    const rendered = await renderTemplate(EMAILS.TEAM_INVITATION, {
      email: 'teat@bcgov.bc.ca',
      team: { id: 1, name: 'testteam' },
      invitationLink: `https://mysite.com/invitation-link`,
      role: 'admin',
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for TEAM_MEMBER_DELETED_ADMINS', async () => {
    const rendered = await renderTemplate(EMAILS.TEAM_MEMBER_DELETED_ADMINS, {
      user: { id: 1, displayName: 'test user' },
      team: { id: 1, name: 'testteam' },
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for TEAM_MEMBER_DELETED_USER_REMOVED', async () => {
    const rendered = await renderTemplate(EMAILS.TEAM_MEMBER_DELETED_USER_REMOVED, {
      user: { id: 1, displayName: 'test user' },
      team: { id: 1, name: 'testteam' },
    });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for TEAM_DELETED', async () => {
    const rendered = await renderTemplate(EMAILS.TEAM_DELETED, { team: { id: 1, name: 'testteam' } });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for REQUEST_LIMIT_EXCEEDED', async () => {
    const rendered = await renderTemplate(EMAILS.REQUEST_LIMIT_EXCEEDED, { user: { id: 1, displayName: 'test user' } });
    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for DELETE_INACTIVE_IDIR_USER', async () => {
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

  it('Should return the expected email for CREATE_TEAM_API_ACCOUNT_SUBMITTED', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_TEAM_API_ACCOUNT_SUBMITTED, {
      team: {
        id: 1,
        name: 'Test Team',
      },
      requester: 'Test User',
      integrations: [formDataDev],
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });

  it('Should return the expected email for CREATE_TEAM_API_ACCOUNT_APPROVED', async () => {
    const rendered = await renderTemplate(EMAILS.CREATE_TEAM_API_ACCOUNT_APPROVED, {
      team: {
        id: 1,
        name: 'Test Team',
      },
      requester: 'Test User',
      integrations: [formDataDev],
    });

    expect(rendered.subject).toMatchSnapshot();
    expect(rendered.body).toMatchSnapshot();
  });
});

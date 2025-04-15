import { log } from 'console';
import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  BCEID_ADMIN_IDIR_EMAIL_01,
  BCEID_ADMIN_IDIR_USERID_01,
  GITHUB_ADMIN_IDIR_EMAIL_01,
  GITHUB_ADMIN_IDIR_USERID_01,
  BCSC_ADMIN_IDIR_EMAIL_01,
  BCSC_ADMIN_IDIR_USERID_01,
  SOCIAL_ADMIN_IDIR_USERID_01,
  SOCIAL_ADMIN_IDIR_EMAIL_01,
} from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import {
  createIntegration,
  deleteIntegration,
  getEvents,
  getRequestsForAdmins,
  restoreIntegration,
  updateIntegration,
} from './helpers/modules/integrations';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';

jest.mock('../app/src/keycloak/integration', () => {
  const original = jest.requireActual('../app/src/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@lambda-app/controllers/bc-services-card', () => {
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

jest.mock('@lambda-app/bcsc/client', () => {
  const original = jest.requireActual('@lambda-app/bcsc/client');
  return {
    ...original,
    createBCSCClient: jest.fn(() =>
      Promise.resolve({
        data: {
          client_secret: 'secret',
          client_id: 'client_id',
          registration_access_token: 'token',
        },
      }),
    ),
    updateBCSCClient: jest.fn(() =>
      Promise.resolve({
        data: {
          client_secret: 'secret',
          client_id: 'client_id',
          registration_access_token: 'token',
        },
      }),
    ),
  };
});

// TODO: IDP approver tests
describe('IDP Approver', () => {
  beforeAll(async () => {
    process.env.INCLUDE_SOCIAL = 'true';
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    await cleanUpDatabaseTables();
    await buildIntegration({
      projectName: 'bceid',
      submitted: true,
      bceid: true,
      prodEnv: true,
    });
    await buildIntegration({
      projectName: 'github',
      submitted: true,
      github: true,
      prodEnv: true,
    });
    await buildIntegration({
      projectName: 'bc-services-card',
      submitted: true,
      bcServicesCard: true,
      prodEnv: true,
    });
    await buildIntegration({
      projectName: 'social',
      submitted: true,
      social: true,
      prodEnv: true,
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Approver can delete their own integration when team is not yet assigned', async () => {
    createMockAuth(BCEID_ADMIN_IDIR_USERID_01, BCEID_ADMIN_IDIR_EMAIL_01, ['bceid-approver']);
    const unassignedTeamIntegration = await createIntegration({
      projectName: 'Unassigned',
      usesTeam: true,
      teamId: null,
    });
    const deleteResponse = await deleteIntegration(unassignedTeamIntegration.body.id);
    expect(deleteResponse.status).toBe(200);
  });

  it('Approver cannot delete others integrations when team is not yet assigned', async () => {
    // Create as a different user
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const unassignedTeamIntegration = await createIntegration({
      projectName: 'Unassigned',
      usesTeam: true,
      teamId: null,
    });

    // Attempt to delete as approver, expect failure
    createMockAuth(BCEID_ADMIN_IDIR_USERID_01, BCEID_ADMIN_IDIR_EMAIL_01, ['bceid-approver']);
    const deleteResponse = await deleteIntegration(unassignedTeamIntegration.body.id);
    expect(deleteResponse.status).toBe(401);
  });

  it.skip('BCeID approver can view and approve any bceid integration but cannot edit/delete/restore', async () => {
    createMockAuth(BCEID_ADMIN_IDIR_USERID_01, BCEID_ADMIN_IDIR_EMAIL_01, ['bceid-approver']);
    const requests = await getRequestsForAdmins();

    expect(requests.status).toEqual(200);
    expect(requests.body.count).toEqual(1);
    expect(requests.body.rows[0].projectName).toEqual('bceid');
    expect(requests.body.rows[0].bceidApproved).toEqual(false);

    const approveRes = await updateIntegration(
      { ...requests.body.rows[0], bceidApproved: true, devValidRedirectUris: ['https://other-application-route'] },
      true,
    );

    expect(approveRes.status).toEqual(200);
    expect(approveRes.body.bceidApproved).toEqual(true);
    expect(approveRes.body.devValidRedirectUris).not.toEqual(['https://other-application-route']);

    const deleteRes = await deleteIntegration(requests.body.rows[0].id);
    expect(deleteRes.status).toEqual(401);

    const eventsRes = await getEvents(requests.body.rows[0].id);
    expect(eventsRes.status).toEqual(200);
    expect(eventsRes.body.count).toEqual(1);
    expect(eventsRes.body.rows.length).toEqual(1);
    expect(eventsRes.body.rows[0].details.changes[0].path).toContain('bceidApproved');

    const restoreRes = await restoreIntegration(requests.body.rows[0].id, BCEID_ADMIN_IDIR_EMAIL_01);
    expect(restoreRes.status).toEqual(403);
  });

  it.skip('BCeID approver can edit/approve/delete owned integrations', async () => {
    createMockAuth(BCEID_ADMIN_IDIR_USERID_01, BCEID_ADMIN_IDIR_EMAIL_01, ['bceid-approver']);
    const bceidApproverIntegration = await buildIntegration({
      projectName: 'bceid-approver',
      submitted: true,
      bceid: true,
      prodEnv: true,
    });

    expect(bceidApproverIntegration.status).toEqual(200);

    const requests = await getRequestsForAdmins();
    const createdReq = requests.body.rows.find((row) => row.projectName === 'bceid-approver');
    expect(requests.status).toEqual(200);
    expect(createdReq).toBeTruthy();

    const approveRes = await updateIntegration(
      { ...createdReq, bceidApproved: true, devValidRedirectUris: ['https://other-application-route'] },
      true,
    );

    expect(approveRes.status).toEqual(200);
    expect(approveRes.body.bceidApproved).toEqual(true);
    expect(approveRes.body.devValidRedirectUris).toEqual(['https://other-application-route']);

    const deleteRes = await deleteIntegration(createdReq.id);
    expect(deleteRes.status).toEqual(200);
  });

  it.skip('Social approver can view and approve any social integration but cannot edit/delete/restore', async () => {
    createMockAuth(SOCIAL_ADMIN_IDIR_USERID_01, SOCIAL_ADMIN_IDIR_EMAIL_01, ['social-approver']);
    const requests = await getRequestsForAdmins();

    expect(requests.status).toEqual(200);
    expect(requests.body.count).toEqual(1);
    expect(requests.body.rows[0].projectName).toEqual('social');
    expect(requests.body.rows[0].socialApproved).toEqual(false);

    const approveRes = await updateIntegration(
      { ...requests.body.rows[0], socialApproved: true, devValidRedirectUris: ['https://other-application-route'] },
      true,
    );

    expect(approveRes.status).toEqual(200);
    expect(approveRes.body.socialApproved).toEqual(true);
    expect(approveRes.body.devValidRedirectUris).not.toEqual(['https://other-application-route']);

    const deleteRes = await deleteIntegration(requests.body.rows[0].id);
    expect(deleteRes.status).toEqual(401);

    const eventsRes = await getEvents(requests.body.rows[0].id);
    expect(eventsRes.status).toEqual(200);
    expect(eventsRes.body.count).toEqual(1);
    expect(eventsRes.body.rows.length).toEqual(1);
    expect(eventsRes.body.rows[0].details.changes[0].path).toContain('socialApproved');

    const restoreRes = await restoreIntegration(requests.body.rows[0].id, SOCIAL_ADMIN_IDIR_EMAIL_01);
    expect(restoreRes.status).toEqual(403);
  });

  it.skip('Social approver can edit/approve/delete owned integrations', async () => {
    createMockAuth(SOCIAL_ADMIN_IDIR_USERID_01, SOCIAL_ADMIN_IDIR_EMAIL_01, ['social-approver']);
    const socialApproverIntegration = await buildIntegration({
      projectName: 'social-approver',
      submitted: true,
      social: true,
      prodEnv: true,
    });

    expect(socialApproverIntegration.status).toEqual(200);

    const requests = await getRequestsForAdmins();
    const createdReq = requests.body.rows.find((row) => row.projectName === 'social-approver');
    expect(requests.status).toEqual(200);
    expect(createdReq).toBeTruthy();

    const approveRes = await updateIntegration(
      { ...createdReq, socialApproved: true, devValidRedirectUris: ['https://other-application-route'] },
      true,
    );

    expect(approveRes.status).toEqual(200);
    expect(approveRes.body.socialApproved).toEqual(true);
    expect(approveRes.body.devValidRedirectUris).toEqual(['https://other-application-route']);

    const deleteRes = await deleteIntegration(createdReq.id);
    expect(deleteRes.status).toEqual(200);
  });

  it.skip('GitHub approver can view and approve any github integration but cannot edit/delete/restore', async () => {
    createMockAuth(GITHUB_ADMIN_IDIR_USERID_01, GITHUB_ADMIN_IDIR_EMAIL_01, ['github-approver']);
    const requests = await getRequestsForAdmins();
    expect(requests.status).toEqual(200);
    expect(requests.body.count).toEqual(1);
    expect(requests.body.rows[0].projectName).toEqual('github');
    expect(requests.body.rows[0].githubApproved).toEqual(false);

    const approveRes = await updateIntegration(
      { ...requests.body.rows[0], githubApproved: true, devValidRedirectUris: ['https://other-application-route'] },
      true,
    );

    expect(approveRes.status).toEqual(200);
    expect(approveRes.body.githubApproved).toEqual(true);
    expect(approveRes.body.devValidRedirectUris).not.toEqual(['https://other-application-route']);

    const deleteRes = await deleteIntegration(requests.body.rows[0].id);
    expect(deleteRes.status).toEqual(401);

    const eventsRes = await getEvents(requests.body.rows[0].id);
    expect(eventsRes.status).toEqual(200);
    expect(eventsRes.body.count).toEqual(1);
    expect(eventsRes.body.rows.length).toEqual(1);
    expect(eventsRes.body.rows[0].details.changes[0].path).toContain('githubApproved');

    const restoreRes = await restoreIntegration(requests.body.rows[0].id, GITHUB_ADMIN_IDIR_EMAIL_01);
    expect(restoreRes.status).toEqual(403);
  });

  it.skip('BC Services Card approver can view and approve any bcsc integration but cannot edit/delete/restore', async () => {
    createMockAuth(BCSC_ADMIN_IDIR_USERID_01, BCSC_ADMIN_IDIR_EMAIL_01, ['bc-services-card-approver']);
    const requests = await getRequestsForAdmins();
    expect(requests.status).toEqual(200);
    expect(requests.body.count).toEqual(1);
    expect(requests.body.rows[0].projectName).toEqual('bc-services-card');
    expect(requests.body.rows[0].bcServicesCardApproved).toEqual(null);

    const approveRes = await updateIntegration(
      {
        ...requests.body.rows[0],
        bcServicesCardApproved: true,
        devValidRedirectUris: ['https://other-application-route'],
      },
      true,
    );

    expect(approveRes.status).toEqual(200);
    expect(approveRes.body.bcServicesCardApproved).toEqual(true);
    expect(approveRes.body.devValidRedirectUris).not.toEqual(['https://other-application-route']);

    const deleteRes = await deleteIntegration(requests.body.rows[0].id);
    expect(deleteRes.status).toEqual(401);

    const eventsRes = await getEvents(requests.body.rows[0].id);
    console.log(eventsRes.body);
    expect(eventsRes.status).toEqual(200);
    expect(eventsRes.body.count).toEqual(1);
    expect(eventsRes.body.rows.length).toEqual(1);
    expect(eventsRes.body.rows[0].details.changes[0].path).toContain('bcServicesCardApproved');

    const restoreRes = await restoreIntegration(requests.body.rows[0].id, BCSC_ADMIN_IDIR_EMAIL_01);
    expect(restoreRes.status).toEqual(403);
  });
});

describe('Approval Permissions', () => {
  it.skip('Keeps bceid approval flag immutable for regular users', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const bceidIntegration = await buildIntegration({
      projectName: 'bceid',
      submitted: true,
      bceid: true,
      prodEnv: true,
    });
    const approveRes = await updateIntegration(
      {
        ...bceidIntegration.body,
        bceidApproved: true,
      },
      true,
    );
    expect(approveRes.body.bceidApproved).toBeFalsy();
  });

  it.skip('Keeps github approval flag immutable for regular users', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const githubIntegration = await buildIntegration({
      projectName: 'github',
      submitted: true,
      github: true,
      prodEnv: true,
    });
    const approveRes = await updateIntegration(
      {
        ...githubIntegration.body,
        githubApproved: true,
      },
      true,
    );
    expect(approveRes.body.githubApproved).toBeFalsy();
  });

  it.skip('Keeps bcsc approval flag immutable for regular users', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const bcServicesCardIntegration = await buildIntegration({
      projectName: 'bc-services-card',
      submitted: true,
      bcServicesCard: true,
      prodEnv: true,
    });
    const approveRes = await updateIntegration(
      {
        ...bcServicesCardIntegration.body,
        bcServicesCardApproved: true,
      },
      true,
    );
    console.log(approveRes.body);
    expect(approveRes.body.bcServicesCardApproved).toBeFalsy();
  });
});

// TODO: IDP approver can only update approved flag but can edit other fields for owned integrations

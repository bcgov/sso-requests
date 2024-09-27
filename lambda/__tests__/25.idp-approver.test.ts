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
} from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import {
  deleteIntegration,
  getEvents,
  getRequestsForAdmins,
  restoreIntegration,
  updateIntegration,
} from './helpers/modules/integrations';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';

jest.mock('../app/src/authenticate');

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

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
  let bceidIntegration, githubIntegration, bcServicesCardIntegration;
  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    await cleanUpDatabaseTables();
    bceidIntegration = await buildIntegration({
      projectName: 'bceid',
      submitted: true,
      bceid: true,
      prodEnv: true,
    });
    githubIntegration = await buildIntegration({
      projectName: 'github',
      submitted: true,
      github: true,
      prodEnv: true,
    });
    bcServicesCardIntegration = await buildIntegration({
      projectName: 'bc-services-card',
      submitted: true,
      bcServicesCard: true,
      prodEnv: true,
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('BCeID approver can view and approve any bceid integration but cannot edit/delete/restore', async () => {
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

  it('BCeID approver can edit/approve/delete owned integrations', async () => {
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

  it('GitHub approver can view and approve any github integration but cannot edit/delete/restore', async () => {
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

  it('BC Services Card approver can view and approve any bcsc integration but cannot edit/delete/restore', async () => {
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

// TODO: IDP approver can only update approved flag but can edit other fields for owned integrations

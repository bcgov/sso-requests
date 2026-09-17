import { KeycloakService } from '@/services/keycloak-service';
import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_02,
  TEAM_ADMIN_IDIR_EMAIL_02,
  TEAM_MEMBER_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
} from './helpers/fixtures';
import { seedTeamAndMembers, seedIntergrations, seedApiAccount } from './helpers/seeder';
import supertest from 'supertest';
import app from '@/tests/helpers/server';
import models from '@/sequelize/models/models';
import * as authenticateModule from '@/modules/authenticate';

let team;
let integration;
let apiAccount;
const API_BASE_PATH = '/api/v1';

const waitForRows = async (read: () => Promise<any[]>, attempts = 20): Promise<any[]> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const rows = await read();
    if (rows.length > 0) return rows;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return read();
};

describe('API Usage', () => {
  beforeAll(async () => {
    jest.clearAllMocks();
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    team = await seedTeamAndMembers('test team', [
      {
        idirUserId: TEAM_ADMIN_IDIR_USERID_01,
        email: TEAM_ADMIN_IDIR_EMAIL_01,
        role: 'admin',
      },
      {
        idirUserId: TEAM_ADMIN_IDIR_USERID_02,
        email: TEAM_ADMIN_IDIR_EMAIL_02,
        role: 'admin',
      },
      {
        idirUserId: TEAM_MEMBER_IDIR_USERID_01,
        email: TEAM_MEMBER_IDIR_EMAIL_01,
        role: 'admin',
      },
    ]);

    // The API account whose grants authorize every request below.
    apiAccount = await seedApiAccount(team.id);

    integration = await seedIntergrations({
      integrationName: 'Test Integration',
      teamId: team?.id,
      submitted: true,
    });
  });

  it('should not save unauthenticated api usage', async () => {
    await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(401);
    await models.apiUsageMetrics.count().then((count) => expect(count).toBe(0));
  });

  it('should save authenticated api usage', async () => {
    jest.spyOn(authenticateModule, 'authenticate').mockImplementationOnce(() => {
      return Promise.resolve({
        success: true,
        data: { teamId: team.id, apiClientId: apiAccount.clientId } as any,
        err: null,
      });
    });
    await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(200);

    // The row is written from the response's `finish` handler, which the client
    // does not wait for, so the read is retried rather than raced.
    const rows = await waitForRows(() => models.apiUsageMetrics.findAll({ where: { teamId: team.id } }));
    expect(rows.length).toBe(1);
    expect(rows[0].teamId).toBe(team.id);
    expect(rows[0].apiClientId).toBe(apiAccount.clientId);
  });
});

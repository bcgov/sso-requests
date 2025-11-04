import { KeycloakService } from '@/services/keycloak-service';
import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_02,
  TEAM_ADMIN_IDIR_EMAIL_02,
  TEAM_MEMBER_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
} from './helpers/fixtures';
import { seedTeamAndMembers, seedIntergrations } from './helpers/seeder';
import supertest from 'supertest';
import app from '@/tests/helpers/server';
import models from '@/sequelize/models/models';
import * as authenticateModule from '@/modules/authenticate';

let team;
let integration;
const API_BASE_PATH = '/api/v1';

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
        data: { teamId: team.id as any },
        err: null,
      });
    });
    await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(200);
    const rows = await models.apiUsageMetrics.findAll({
      where: { teamId: team.id },
    });
    expect(rows.length).toBe(1);
    expect(rows[0].teamId).toBe(team.id);
  });
});

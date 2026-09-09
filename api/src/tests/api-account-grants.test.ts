import supertest from 'supertest';
import app from '@/tests/helpers/server';
import { KeycloakService } from '@/services/keycloak-service';
import { seedApiAccount, seedIntergrations, seedTeamAndMembers } from './helpers/seeder';
import { clearAuthContextCache } from '@/modules/authorization';

const API_BASE_PATH = '/api/v1';

let teamA: any;
let teamB: any;
let integrationA: any;
let integrationB: any;
let integrationA2: any;
let apiClientId: string;

jest.mock('@/modules/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve({
        success: true,
        data: { teamId: null, apiClientId },
        err: null,
      });
    }),
  };
});

const seedTeam = (name: string, slug: string) =>
  seedTeamAndMembers(name, [
    {
      idirUserId: `grants-${slug}-userid`,
      email: `grants-${slug}@gov.bc.ca`,
      role: 'admin',
    },
  ]);

describe('api account grants', () => {
  beforeAll(async () => {
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => Promise.resolve());
    jest.spyOn(KeycloakService.prototype, 'listClientRoles').mockImplementation(() => Promise.resolve([]));

    teamA = await seedTeam('grants team a', 'a');
    teamB = await seedTeam('grants team b', 'b');

    integrationA = await seedIntergrations({
      integrationName: 'Grants Integration A',
      teamId: teamA.id,
      submitted: true,
    });
    integrationA2 = await seedIntergrations({
      integrationName: 'Grants Integration A2',
      teamId: teamA.id,
      submitted: true,
    });
    integrationB = await seedIntergrations({
      integrationName: 'Grants Integration B',
      teamId: teamB.id,
      submitted: true,
    });
  });

  beforeEach(() => {
    clearAuthContextCache();
  });

  describe('an account scoped to one team', () => {
    beforeAll(async () => {
      const account = await seedApiAccount(teamA.id);
      apiClientId = account.clientId;
    });

    it('reaches its own team integration', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationA.id}`).expect(200);
    });

    it('cannot see another team integration', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationB.id}`).expect(404);
    });

    it('lists only its own team integrations', async () => {
      const result = await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(200);
      const ids = result.body.data.map((int: any) => int.id).sort();
      expect(ids).toEqual([integrationA.id, integrationA2.id].sort());
    });

    it('rejects an unknown environment before evaluating access', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationA.id}/staging/roles`).expect(400);
    });
  });

  describe('an account scoped to a single integration and environment', () => {
    beforeAll(async () => {
      const account = await seedApiAccount(teamA.id, [
        { teamId: null, integrationId: integrationA.id, environment: 'dev', level: 'viewer' },
      ]);
      apiClientId = account.clientId;
    });

    it('reads roles in the granted environment', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationA.id}/dev/roles`).expect(200);
    });

    it('cannot read roles in an environment it was not granted', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationA.id}/test/roles`).expect(404);
    });

    it('cannot write roles it only has read access to', async () => {
      await supertest(app)
        .post(`${API_BASE_PATH}/integrations/${integrationA.id}/dev/roles`)
        .send({ name: 'nope' })
        .expect(404);
    });

    it('cannot reach a sibling integration in the same team', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationA2.id}`).expect(404);
    });
  });
});

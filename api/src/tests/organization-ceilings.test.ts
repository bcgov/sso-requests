import supertest from 'supertest';
import app from '@/tests/helpers/server';
import { KeycloakService } from '@/services/keycloak-service';
import {
  seedIntergrations,
  seedOrganization,
  seedOrganizationApiAccount,
  seedOrganizationTeam,
  seedTeamAndMembers,
  ApiAccountGrantSeed,
  CeilingSeed,
} from './helpers/seeder';
import { clearAuthContextCache } from '@/modules/authorization';

const API_BASE_PATH = '/api/v1';

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
      idirUserId: `org-${slug}-userid`,
      email: `org-${slug}@gov.bc.ca`,
      role: 'admin',
    },
  ]);

const fullCeiling = (): CeilingSeed[] => [{ level: 'editor' }];

const wildcardGrants = (teamId: number): ApiAccountGrantSeed[] => [
  { teamId, integrationId: null, environment: null, level: 'editor' },
];

describe('organization api accounts', () => {
  let organization: any;
  let teamA: any;
  let teamB: any;
  let teamC: any;
  let integrationA: any;
  let integrationB: any;
  let integrationC: any;

  beforeAll(async () => {
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => Promise.resolve());
    jest.spyOn(KeycloakService.prototype, 'listClientRoles').mockImplementation(() => Promise.resolve([]));
    jest
      .spyOn(KeycloakService.prototype, 'createClientRole')
      .mockImplementation(() => Promise.resolve({ name: 'allowed-role' }) as any);

    organization = await seedOrganization('org ministry');

    teamA = await seedTeam('org team a', 'a');
    teamB = await seedTeam('org team b', 'b');
    teamC = await seedTeam('org team c', 'c');

    integrationA = await seedIntergrations({ integrationName: 'Org A', teamId: teamA.id, submitted: true });
    integrationB = await seedIntergrations({ integrationName: 'Org B', teamId: teamB.id, submitted: true });
    integrationC = await seedIntergrations({ integrationName: 'Org C', teamId: teamC.id, submitted: true });
  });

  beforeEach(() => {
    clearAuthContextCache();
  });

  describe('an account granted more than the teams consented to', () => {
    let linkA: any;
    let linkB: any;

    beforeAll(async () => {
      // Team A consents to everything; team B only to viewing.
      linkA = await seedOrganizationTeam(organization.id, teamA.id, fullCeiling());
      linkB = await seedOrganizationTeam(organization.id, teamB.id, [{ level: 'viewer' }]);
      // Team C was invited but never accepted.
      await seedOrganizationTeam(organization.id, teamC.id, fullCeiling(), true);

      const account = await seedOrganizationApiAccount(organization.id, [
        ...wildcardGrants(teamA.id),
        ...wildcardGrants(teamB.id),
        ...wildcardGrants(teamC.id),
      ]);
      apiClientId = account.clientId;
    });

    it('reaches a team that consented in full', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationA.id}`).expect(200);
    });

    it('is held to the narrower ceiling of a team that consented in part', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationB.id}/dev/roles`).expect(200);
      await supertest(app)
        .post(`${API_BASE_PATH}/integrations/${integrationB.id}/dev/roles`)
        .send({ name: 'blocked-role' })
        .expect(404);
    });

    it('cannot reach a team that has not accepted its invitation', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationC.id}`).expect(404);
    });

    // Viewer is the lowest level that can see anything at all, so team B shows
    // up in the listing while still being unable to change anything.
    it('lists only the integrations covered by an accepted ceiling', async () => {
      const result = await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(200);
      const ids = result.body.data.map((integration: any) => integration.id);
      expect(ids).toContain(integrationA.id);
      expect(ids).toContain(integrationB.id);
      expect(ids).not.toContain(integrationC.id);
    });

    it('loses access the moment a team leaves, without any grant changing', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationA.id}`).expect(200);

      await linkA.destroy();
      clearAuthContextCache();

      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationA.id}`).expect(404);
    });

    it('loses access the moment a team narrows its ceiling', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationB.id}/dev/roles`).expect(200);

      await linkB.destroy();
      clearAuthContextCache();

      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationB.id}/dev/roles`).expect(404);
    });
  });

  describe('an account whose ceiling is narrower than its grant', () => {
    beforeAll(async () => {
      const team = await seedTeam('org team d', 'd');
      const integration = await seedIntergrations({ integrationName: 'Org D', teamId: team.id, submitted: true });

      // The team consents to role reads in dev only.
      await seedOrganizationTeam(organization.id, team.id, [{ environment: 'dev', level: 'viewer' }]);

      // The account is granted the same level in every environment.
      const account = await seedOrganizationApiAccount(organization.id, [
        { teamId: team.id, integrationId: null, environment: null, level: 'viewer' },
      ]);
      apiClientId = account.clientId;

      integrationD = integration;
    });

    let integrationD: any;

    it('is narrowed to the consented environment', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationD.id}/dev/roles`).expect(200);
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationD.id}/test/roles`).expect(404);
    });
  });

  // The whole point of naming an integration is that it overrides the team-wide
  // row, in either direction, on either side of the negotiation.
  describe('per-integration rows', () => {
    let team: any;
    let raised: any;
    let lowered: any;
    let untouched: any;

    beforeAll(async () => {
      team = await seedTeam('org team e', 'e');
      raised = await seedIntergrations({ integrationName: 'Org E1', teamId: team.id, submitted: true });
      lowered = await seedIntergrations({ integrationName: 'Org E2', teamId: team.id, submitted: true });
      untouched = await seedIntergrations({ integrationName: 'Org E3', teamId: team.id, submitted: true });

      // The team consents to viewing everything, and to editing one integration.
      await seedOrganizationTeam(organization.id, team.id, [
        { level: 'viewer' },
        { integrationId: raised.id, level: 'editor' },
      ]);

      // The account is granted editor team-wide, but is explicitly carved out
      // of one integration entirely.
      const account = await seedOrganizationApiAccount(organization.id, [
        { teamId: team.id, integrationId: null, environment: null, level: 'editor' },
        { teamId: team.id, integrationId: lowered.id, environment: null, level: 'none' },
      ]);
      apiClientId = account.clientId;
    });

    it('is raised on the integration the team singled out', async () => {
      await supertest(app)
        .post(`${API_BASE_PATH}/integrations/${raised.id}/dev/roles`)
        .send({ name: 'allowed-role' })
        .expect(201);
    });

    it('is held to the team-wide ceiling on an integration nobody singled out', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${untouched.id}/dev/roles`).expect(200);
      await supertest(app)
        .post(`${API_BASE_PATH}/integrations/${untouched.id}/dev/roles`)
        .send({ name: 'blocked-role' })
        .expect(404);
    });

    it('is denied entirely on an integration explicitly carved out of the grant', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${lowered.id}`).expect(404);
    });

    it('omits a carved-out integration from the listing while keeping its siblings', async () => {
      const result = await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(200);
      const ids = result.body.data.map((integration: any) => integration.id);
      expect(ids).toContain(raised.id);
      expect(ids).toContain(untouched.id);
      expect(ids).not.toContain(lowered.id);
    });
  });
});

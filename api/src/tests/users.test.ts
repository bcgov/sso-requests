import supertest from 'supertest';
import createHttpError from 'http-errors';
import app from './helpers/server';
import { authenticate } from '../modules/authenticate';
import { UserService } from '../services/user-service';
import { KeycloakService } from '../services/keycloak-service';
import {
  SEARCH_USER_EMAIL,
  SEARCH_USER_FIRST_NAME,
  SEARCH_USER_GUID,
  SEARCH_USER_LAST_NAME,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_EMAIL_03,
  TEAM_ADMIN_IDIR_EMAIL_02,
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_USERID_02,
  TEAM_ADMIN_IDIR_USERID_03,
} from './helpers/fixtures';
import { seedIntergrations, seedTeamWithApiAccount } from './helpers/seeder';
import {
  buildKeycloakUser,
  mockKeycloakGetUserRealmRoles,
  mockKeycloakGetUsers,
  mockKeycloakGetUsersError,
  mockKeycloakSetEnvironment,
  spyOnKeycloakServiceFactory,
} from './helpers/keycloak';

const API_BASE_PATH = '/api/v1';

let team: any;
let apiAccount: any;

jest.mock('@/modules/authenticate', () => {
  return {
    authenticate: jest.fn(() =>
      Promise.resolve({
        success: true,
        data: { teamId: team.id, apiClientId: apiAccount.clientId } as any,
        err: null,
      }),
    ),
  };
});

type QueryKind = 'common' | 'github' | 'bceid';

interface IdpRoute {
  path: string;
  idp: string;
  kind: QueryKind;
}

const IDP_ROUTES: IdpRoute[] = [
  { path: 'idir', idp: 'idir', kind: 'common' },
  { path: 'azure-idir', idp: 'azureidir', kind: 'common' },
  { path: 'bcgov-idir', idp: 'bcgovidir', kind: 'common' },
  { path: 'github-bcgov', idp: 'githubbcgov', kind: 'github' },
  { path: 'github-public', idp: 'githubpublic', kind: 'github' },
  { path: 'basic-bceid', idp: 'bceidbasic', kind: 'bceid' },
  { path: 'business-bceid', idp: 'bceidbusiness', kind: 'bceid' },
  { path: 'basic-business-bceid', idp: 'bceidboth', kind: 'bceid' },
];

const COMMON_ROUTES = IDP_ROUTES.filter((r) => r.kind === 'common');
const GITHUB_ROUTES = IDP_ROUTES.filter((r) => r.kind === 'github');
const BCEID_ROUTES = IDP_ROUTES.filter((r) => r.kind === 'bceid');

/** guid is the one search field every IDP route accepts. */
const VALID_QUERY = { guid: SEARCH_USER_GUID };

const usersUrl = (path: string, environment = 'dev') => `${API_BASE_PATH}/${environment}/${path}/users`;

const getUsers = (path: string, query: Record<string, unknown> = {}, environment = 'dev') =>
  supertest(app).get(usersUrl(path, environment)).query(query).set('Accept', 'application/json');

describe('IDP user search endpoints', () => {
  beforeAll(async () => {
    ({ team, apiAccount } = await seedTeamWithApiAccount('users test team', {
      idirUserId: TEAM_ADMIN_IDIR_USERID_01,
      email: TEAM_ADMIN_IDIR_EMAIL_01,
    }));
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockKeycloakSetEnvironment();
  });

  describe('input mapping to the Keycloak user query', () => {
    it.each(COMMON_ROUTES)('$path maps firstName, lastName, email and guid', async ({ path, idp }) => {
      const getUsersMock = mockKeycloakGetUsers([]);

      await getUsers(path, {
        firstName: SEARCH_USER_FIRST_NAME,
        lastName: SEARCH_USER_LAST_NAME,
        email: SEARCH_USER_EMAIL,
        guid: SEARCH_USER_GUID,
      }).expect(200);

      expect(getUsersMock).toHaveBeenCalledTimes(1);
      expect(getUsersMock).toHaveBeenCalledWith({
        username: `${SEARCH_USER_GUID}@${idp}`,
        email: SEARCH_USER_EMAIL,
        firstName: SEARCH_USER_FIRST_NAME,
        lastName: SEARCH_USER_LAST_NAME,
      });
    });

    it.each(COMMON_ROUTES)('$path scopes the search to the idp suffix when guid is omitted', async ({ path, idp }) => {
      const getUsersMock = mockKeycloakGetUsers([]);

      await getUsers(path, { firstName: SEARCH_USER_FIRST_NAME }).expect(200);

      const [userQuery] = getUsersMock.mock.calls[0];
      expect(userQuery).toStrictEqual({
        username: `@${idp}`,
        email: '',
        firstName: SEARCH_USER_FIRST_NAME,
        lastName: undefined,
      });
    });

    it.each(GITHUB_ROUTES)('$path maps name -> firstName and login -> lastName', async ({ path, idp }) => {
      const getUsersMock = mockKeycloakGetUsers([]);

      await getUsers(path, {
        name: 'Octo Cat',
        login: 'octocat',
        email: SEARCH_USER_EMAIL,
        guid: SEARCH_USER_GUID,
      }).expect(200);

      expect(getUsersMock).toHaveBeenCalledWith({
        username: `${SEARCH_USER_GUID}@${idp}`,
        email: SEARCH_USER_EMAIL,
        firstName: 'Octo Cat',
        lastName: 'octocat',
      });
    });

    it.each(BCEID_ROUTES)('$path only forwards guid', async ({ path, idp }) => {
      const getUsersMock = mockKeycloakGetUsers([]);

      await getUsers(path, { guid: SEARCH_USER_GUID }).expect(200);

      const [userQuery] = getUsersMock.mock.calls[0];
      expect(userQuery).toStrictEqual({
        username: `${SEARCH_USER_GUID}@${idp}`,
        email: '',
        firstName: undefined,
        lastName: undefined,
      });
    });
  });

  describe('functions called', () => {
    it.each(IDP_ROUTES)('$path delegates to UserService.getUsers with the route idp', async ({ path, idp }) => {
      mockKeycloakGetUsers([]);
      const serviceSpy = jest.spyOn(UserService.prototype, 'getUsers');
      const query = VALID_QUERY;

      await getUsers(path, query).expect(200);

      expect(serviceSpy).toHaveBeenCalledTimes(1);
      expect(serviceSpy).toHaveBeenCalledWith('dev', idp, query);
    });

    it.each(['dev', 'test', 'prod'])('resolves the Keycloak service for the %s environment', async (environment) => {
      const factorySpy = spyOnKeycloakServiceFactory();
      const setEnvironmentMock = mockKeycloakSetEnvironment();
      mockKeycloakGetUsers([]);

      await getUsers('idir', { guid: SEARCH_USER_GUID }, environment).expect(200);

      expect(factorySpy).toHaveBeenCalledWith(environment);
      expect(setEnvironmentMock).toHaveBeenCalledWith(environment);
    });

    it.each(IDP_ROUTES)('$path does not look up realm roles', async ({ path }) => {
      mockKeycloakGetUsers([buildKeycloakUser()]);
      const realmRolesMock = mockKeycloakGetUserRealmRoles();

      await getUsers(path, VALID_QUERY).expect(200);

      expect(realmRolesMock).not.toHaveBeenCalled();
    });
  });

  describe('Keycloak response mapping', () => {
    it.each([...COMMON_ROUTES, ...BCEID_ROUTES])('$path returns only the public user fields', async ({ path, idp }) => {
      const keycloakUser = buildKeycloakUser({ username: `${SEARCH_USER_GUID}@${idp}` });
      mockKeycloakGetUsers([keycloakUser]);

      const result = await getUsers(path, VALID_QUERY).expect(200);

      expect(result.body).toStrictEqual({
        data: [
          {
            firstName: keycloakUser.firstName,
            lastName: keycloakUser.lastName,
            email: keycloakUser.email,
            username: keycloakUser.username,
            attributes: keycloakUser.attributes,
          },
        ],
      });
    });

    it.each(GITHUB_ROUTES)('$path blanks first and last names', async ({ path, idp }) => {
      const keycloakUser = buildKeycloakUser({ username: `${SEARCH_USER_GUID}@${idp}` });
      mockKeycloakGetUsers([keycloakUser]);

      const result = await getUsers(path, { login: 'octocat' }).expect(200);

      expect(result.body.data).toStrictEqual([
        {
          firstName: '',
          lastName: '',
          email: keycloakUser.email,
          username: keycloakUser.username,
          attributes: keycloakUser.attributes,
        },
      ]);
    });

    it('returns every user Keycloak returns, preserving order', async () => {
      const users = ['a', 'b', 'c'].map((suffix) =>
        buildKeycloakUser({ username: `${suffix}${SEARCH_USER_GUID}@idir`, email: `${suffix}@gov.bc.ca` }),
      );
      mockKeycloakGetUsers(users);

      const result = await getUsers('idir', { lastName: SEARCH_USER_LAST_NAME }).expect(200);

      expect(result.body.data.map((u: any) => u.username)).toEqual(users.map((u) => u.username));
    });

    it('returns an empty list when Keycloak finds no users', async () => {
      mockKeycloakGetUsers([]);

      const result = await getUsers('azure-idir', { email: SEARCH_USER_EMAIL }).expect(200);

      expect(result.body).toStrictEqual({ data: [] });
    });
  });

  describe('errors', () => {
    describe('query validation', () => {
      it.each([
        ...COMMON_ROUTES.map((r) => [r.path, {}, 'firstName is required'] as const),
        ...COMMON_ROUTES.map(
          (r) => [r.path, { firstName: 'a' }, 'firstName should be string with length >= 2'] as const,
        ),
        ...COMMON_ROUTES.map((r) => [r.path, { email: 'a' }, 'email should be string with length >= 2'] as const),
        ...COMMON_ROUTES.map(
          (r) =>
            [
              r.path,
              { guid: SEARCH_USER_GUID, name: 'x' },
              'only firstName, lastName, email and guid are supported',
            ] as const,
        ),
        ...GITHUB_ROUTES.map((r) => [r.path, {}, 'name is required'] as const),
        ...GITHUB_ROUTES.map((r) => [r.path, { login: 'a' }, 'login id should be string with length >= 2'] as const),
        ...GITHUB_ROUTES.map(
          (r) =>
            [
              r.path,
              { login: 'octocat', firstName: SEARCH_USER_FIRST_NAME },
              'only name, login, email and guid are supported',
            ] as const,
        ),
        ...BCEID_ROUTES.map((r) => [r.path, {}, 'guid is required'] as const),
        ...BCEID_ROUTES.map((r) => [r.path, { guid: 'a' }, 'guid should be string with length >= 2'] as const),
        ...BCEID_ROUTES.map((r) => [r.path, { email: SEARCH_USER_EMAIL }, 'only guid is supported'] as const),
        ...BCEID_ROUTES.map(
          (r) => [r.path, { guid: SEARCH_USER_GUID, email: SEARCH_USER_EMAIL }, 'only guid is supported'] as const,
        ),
      ])('%s rejects %j with "%s"', async (path, query, message) => {
        const getUsersMock = mockKeycloakGetUsers([]);
        const factorySpy = spyOnKeycloakServiceFactory();

        const result = await getUsers(path, query).expect(400);

        expect(result.body).toStrictEqual({ message });
        expect(factorySpy).not.toHaveBeenCalled();
        expect(getUsersMock).not.toHaveBeenCalled();
      });

      it('rejects a repeated query parameter that arrives as an array', async () => {
        const getUsersMock = mockKeycloakGetUsers([]);

        const result = await supertest(app)
          .get(`${usersUrl('idir')}?guid=${SEARCH_USER_GUID}&guid=${SEARCH_USER_GUID}`)
          .expect(400);

        expect(result.body.message).toBe('guid should be string with length >= 2');
        expect(getUsersMock).not.toHaveBeenCalled();
      });
    });

    it.each(IDP_ROUTES)('$path rejects an unknown environment before reaching the service', async ({ path }) => {
      const serviceSpy = jest.spyOn(UserService.prototype, 'getUsers');
      const getUsersMock = mockKeycloakGetUsers([]);

      const result = await getUsers(path, VALID_QUERY, 'staging').expect(400);

      expect(result.body).toStrictEqual({ message: 'invalid environment' });
      expect(serviceSpy).not.toHaveBeenCalled();
      expect(getUsersMock).not.toHaveBeenCalled();
    });

    it('returns 401 and skips Keycloak when authentication fails', async () => {
      (authenticate as jest.Mock).mockResolvedValueOnce({ success: false, data: null, err: 'invalid token' });
      const getUsersMock = mockKeycloakGetUsers([]);

      const result = await getUsers('idir', { guid: SEARCH_USER_GUID }).expect(401);

      expect(result.body).toStrictEqual({ success: false, data: null, err: 'invalid token' });
      expect(getUsersMock).not.toHaveBeenCalled();
    });

    it('returns 503 and skips Keycloak in maintenance mode', async () => {
      const previous = process.env.MAINTENANCE_MODE_ACTIVE;
      process.env.MAINTENANCE_MODE_ACTIVE = 'true';
      const getUsersMock = mockKeycloakGetUsers([]);

      try {
        await getUsers('idir', { guid: SEARCH_USER_GUID }).expect(503);
      } finally {
        process.env.MAINTENANCE_MODE_ACTIVE = previous;
      }
      expect(getUsersMock).not.toHaveBeenCalled();
    });

    it.each(IDP_ROUTES)('$path hides unexpected Keycloak failures behind a 422', async ({ path }) => {
      mockKeycloakGetUsersError(new Error('connect ECONNREFUSED 127.0.0.1:8080'));

      const result = await getUsers(path, VALID_QUERY).expect(422);

      expect(result.body).toStrictEqual({ message: 'unknown exception' });
    });

    it.each([
      [404, 'user not found'],
      [403, 'forbidden'],
      [502, 'bad gateway'],
    ])('propagates a Keycloak HttpError %i with its message', async (status, message) => {
      mockKeycloakGetUsersError(createHttpError(status, message));

      const result = await getUsers('idir', { guid: SEARCH_USER_GUID }).expect(status);

      expect(result.body).toStrictEqual({ message });
    });
  });
});

describe('integration scoped BCeID user search endpoint', () => {
  let integration: any;
  let otherTeamIntegration: any;

  const bceidUsersUrl = (integrationId: number, environment = 'dev') =>
    `${API_BASE_PATH}/integrations/${integrationId}/${environment}/bceid/users`;

  beforeAll(async () => {
    ({ team, apiAccount } = await seedTeamWithApiAccount('bceid users test team', {
      idirUserId: TEAM_ADMIN_IDIR_USERID_02,
      email: TEAM_ADMIN_IDIR_EMAIL_02,
    }));
    integration = await seedIntergrations({
      integrationName: 'BCeID Users Test Integration',
      idps: ['bceidbasic', 'bceidbusiness'],
      teamId: team.id,
      submitted: true,
    });

    const { team: otherTeam } = await seedTeamWithApiAccount('bceid users other team', {
      idirUserId: TEAM_ADMIN_IDIR_USERID_03,
      email: TEAM_ADMIN_IDIR_EMAIL_03,
    });
    otherTeamIntegration = await seedIntergrations({
      integrationName: 'BCeID Users Other Team Integration',
      idps: ['bceidbasic'],
      teamId: otherTeam.id,
      submitted: true,
    });
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockKeycloakSetEnvironment();
  });

  it.each(['basic', 'business', 'both'])('maps bceidType=%s and the search fields', async (bceidType) => {
    const getUsersMock = mockKeycloakGetUsers([]);

    await supertest(app)
      .get(bceidUsersUrl(integration.id))
      .query({
        bceidType,
        guid: SEARCH_USER_GUID,
        email: SEARCH_USER_EMAIL,
        displayName: SEARCH_USER_FIRST_NAME,
        username: SEARCH_USER_LAST_NAME,
      })
      .expect(200);

    expect(getUsersMock).toHaveBeenCalledWith({
      username: `${SEARCH_USER_GUID}@bceid${bceidType}`,
      email: SEARCH_USER_EMAIL,
      firstName: SEARCH_USER_FIRST_NAME,
      lastName: SEARCH_USER_LAST_NAME,
    });
  });

  it('returns only users holding the integration client realm role', async () => {
    const member = buildKeycloakUser({ username: `member${SEARCH_USER_GUID}@bceidbasic` });
    const outsider = buildKeycloakUser({ username: `outsider${SEARCH_USER_GUID}@bceidbasic` });
    mockKeycloakGetUsers([member, outsider]);
    const realmRolesMock = mockKeycloakGetUserRealmRoles({
      [member.username]: [{ name: `client-${integration.clientId}` }],
      [outsider.username]: [{ name: 'client-some-other-integration' }],
    });

    const result = await supertest(app)
      .get(bceidUsersUrl(integration.id))
      .query({ bceidType: 'basic', email: SEARCH_USER_EMAIL })
      .expect(200);

    expect(realmRolesMock).toHaveBeenCalledTimes(2);
    expect(realmRolesMock).toHaveBeenNthCalledWith(1, member.username);
    expect(realmRolesMock).toHaveBeenNthCalledWith(2, outsider.username);
    expect(result.body).toStrictEqual({
      data: [
        {
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          username: member.username,
          attributes: member.attributes,
        },
      ],
    });
  });

  it.each([
    [{}, 'bceidType is required'],
    [{ bceidType: 'basic' }, 'One of displayName, username, email and guid are required'],
    [{ bceidType: 'basic', guid: 'a' }, 'guid should be string with length >= 2'],
  ])('rejects %j with "%s"', async (query, message) => {
    const getUsersMock = mockKeycloakGetUsers([]);

    const result = await supertest(app).get(bceidUsersUrl(integration.id)).query(query).expect(400);

    expect(result.body).toStrictEqual({ message });
    expect(getUsersMock).not.toHaveBeenCalled();
  });

  it("returns 404 for another team's integration without querying Keycloak", async () => {
    const getUsersMock = mockKeycloakGetUsers([buildKeycloakUser()]);

    const result = await supertest(app)
      .get(bceidUsersUrl(otherTeamIntegration.id))
      .query({ bceidType: 'basic', guid: SEARCH_USER_GUID })
      .expect(404);

    expect(result.body).toStrictEqual({ message: `integration #${otherTeamIntegration.id} not found` });
    expect(getUsersMock).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown integration', async () => {
    const getUsersMock = mockKeycloakGetUsers([]);

    await supertest(app).get(bceidUsersUrl(999999)).query({ bceidType: 'basic', guid: SEARCH_USER_GUID }).expect(404);

    expect(getUsersMock).not.toHaveBeenCalled();
  });

  it('propagates a Keycloak realm role lookup failure as a 422', async () => {
    mockKeycloakGetUsers([buildKeycloakUser({ username: `${SEARCH_USER_GUID}@bceidbasic` })]);
    jest.spyOn(KeycloakService.prototype, 'getUserRealmRoles').mockRejectedValue(new Error('timeout'));

    const result = await supertest(app)
      .get(bceidUsersUrl(integration.id))
      .query({ bceidType: 'basic', guid: SEARCH_USER_GUID })
      .expect(422);

    expect(result.body).toStrictEqual({ message: 'unknown exception' });
  });
});

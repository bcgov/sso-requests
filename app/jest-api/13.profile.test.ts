import { cleanUpDatabaseTables } from './helpers/utils';
import { SSO_TEAM_IDIR_EMAIL, SSO_TEAM_IDIR_USER } from './helpers/fixtures';
import { getAuthenticatedUser, updateProfile } from './helpers/modules/users';
import { createMockAuth } from './__mocks__/authenticate';

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

describe('User Profile', () => {
  beforeEach(() => {
    createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('includes survey submissions in the profile defaulted to null', async () => {
    const result = await getAuthenticatedUser();
    expect(result.status).toBe(200);
    expect(result.body.surveySubmissions).toBe(null);
  });

  it('accepts updates to survey submissions when updating the profile', async () => {
    const newSubmissions = {
      addUserToRole: true,
      createRole: true,
      createIntegration: false,
      cssApiRequest: false,
      viewMetrics: false,
      downloadLogs: false,
    };

    const updateResult = await updateProfile({
      role: 'member',
      idirEmail: SSO_TEAM_IDIR_EMAIL,
      surveySubmissions: newSubmissions,
    });

    expect(updateResult.status).toBe(200);
    const getResult = await getAuthenticatedUser();
    expect(getResult.body.surveySubmissions).toMatchObject(newSubmissions);
  });
});

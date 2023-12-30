import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { SSO_TEAM_IDIR_EMAIL, SSO_TEAM_IDIR_USER } from './helpers/fixtures';
import { getAuthenticatedUser, updateProfile } from './helpers/modules/users';

jest.mock('../app/src/authenticate');
jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('@lambda-app/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => true),
  };
});

describe('User Profile', () => {
  beforeEach(() => {
    createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
  });

  afterEach(async () => {
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

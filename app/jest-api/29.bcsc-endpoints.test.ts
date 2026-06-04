import { createMockAuth } from './mocks/authenticate';
import { getBcscClaims, getPrivacyZones } from './helpers/modules/bcsc';
import { TEAM_MEMBER_IDIR_EMAIL_01, TEAM_MEMBER_IDIR_USERID_01 } from './helpers/fixtures';

jest.mock('axios', () => ({
  get: jest.fn(() =>
    Promise.reject({
      response: {
        status: 500,
      },
    }),
  ),
}));

describe('BCSC data fetching', () => {
  it('Returns 424 when getAttributes upstream call fails with 500', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const response = await getBcscClaims();
    expect(response.status).toBe(424);
  });

  it('Returns 424 when getPrivacyZones upstream call fails with 500', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const response = await getPrivacyZones();
    expect(response.status).toBe(424);
  });
});

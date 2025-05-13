import { createMockAuth } from './mocks/authenticate';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';
import { searchIdirUsers } from './helpers/modules/users';
import { searchIdirEmail } from '@app/utils/ms-graph-idir';

const AZURE_RESPONSE = ['some.user@email.com'];

jest.mock('@app/utils/ms-graph-idir', () => {
  return {
    searchIdirEmail: jest.fn(() => Promise.resolve(AZURE_RESPONSE)),
  };
});

describe('User Search', () => {
  it('Requires Authentication', async () => {
    const result = await searchIdirUsers('hi');
    expect(result.status).toBe(401);
  });

  it('Passes in the query param and returns the results', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const result = await searchIdirUsers('email');
    expect(result.status).toBe(200);
    expect(searchIdirEmail).toHaveBeenCalledWith('email');
    expect(result.body).toEqual(AZURE_RESPONSE);
  });

  it('Returns error code when MS API fails', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    (searchIdirEmail as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('failure')));
    const result = await searchIdirUsers('email');
    expect(result.status).toBe(422);
  });
});

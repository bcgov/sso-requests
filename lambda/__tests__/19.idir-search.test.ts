import { createMockAuth } from './helpers/utils';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';
import { searchIdirUsers } from './helpers/modules/users';
import { fuzzySearchIdirEmail } from '@lambda-app/bceid-webservice-proxy/idir';

jest.mock('../app/src/authenticate');

const AZURE_RESPONSE = ['some.user@email.com'];

jest.mock('../app/src/bceid-webservice-proxy/idir', () => {
  return {
    fuzzySearchIdirEmail: jest.fn(() => Promise.resolve(AZURE_RESPONSE)),
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
    expect(fuzzySearchIdirEmail).toHaveBeenCalledWith('email');
    expect(result.body).toEqual(AZURE_RESPONSE);
  });

  it('Returns error code when MS API fails', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    (fuzzySearchIdirEmail as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('failure')));
    const result = await searchIdirUsers('email');
    expect(result.status).toBe(422);
  });
});

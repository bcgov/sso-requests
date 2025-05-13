import * as authenticateModule from '@app/utils/authenticate';

const mockedAuthenticate = jest.spyOn(authenticateModule, 'authenticate') as jest.Mock<any>;

export const createMockAuth = (idir_userid?: string, email?: string, clientRoles?: string[]) => {
  return mockedAuthenticate.mockImplementation(() => {
    return Promise.resolve({
      idir_userid,
      email,
      client_roles: clientRoles || [],
      given_name: 'Test',
      family_name: 'User',
    });
  });
};

export const clearMockAuth = () => {
  mockedAuthenticate.mockImplementation(() => {
    return Promise.resolve(null);
  });
};

import * as authenticateModule from '@app/utils/authenticate';
import { setCurrentActor } from '@sso/audit/server';

const mockedAuthenticate = jest.spyOn(authenticateModule, 'authenticate') as jest.Mock<any>;
// common-mocks automocks the whole module, so take the real actor mapping.
const { sessionActor } = jest.requireActual('@app/utils/authenticate') as typeof authenticateModule;

export const createMockAuth = (idir_userid?: string, email?: string, clientRoles?: string[]) => {
  return mockedAuthenticate.mockImplementation(() => {
    const session = {
      idir_userid,
      email,
      client_roles: clientRoles || [],
      given_name: 'Test',
      family_name: 'User',
    };
    // As the real authenticate does, so routes write events attributed to this user.
    if (idir_userid) setCurrentActor(sessionActor({ ...session, idir_userid }));
    return Promise.resolve(session);
  });
};

export const clearMockAuth = () => {
  mockedAuthenticate.mockImplementation(() => {
    return Promise.resolve(null);
  });
};

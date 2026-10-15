import jwt from 'jsonwebtoken';
import { authenticate } from '@app/utils/authenticate';

// common-mocks.js automocks authenticate globally; this file tests the real one
jest.unmock('@app/utils/authenticate');
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn((url: string) =>
      Promise.resolve({
        data: url === 'jwks' ? { keys: [{ kid: 'kid-1' }] } : { issuer: 'iss', jwks_uri: 'jwks' },
      }),
    ),
  },
}));
jest.mock('jws', () => ({ __esModule: true, default: { decode: jest.fn(() => ({ header: { kid: 'kid-1' } })) } }));
jest.mock('jwk-to-pem', () => ({ __esModule: true, default: jest.fn(() => 'pem') }));
jest.mock('jsonwebtoken', () => ({ __esModule: true, default: { verify: jest.fn() } }));

const claims = {
  identity_provider: 'idir',
  idir_user_guid: 'GUID',
  client_roles: [],
  given_name: 'Test',
  family_name: 'User',
};

const authenticateWith = (payload: Record<string, unknown>) => {
  (jwt.verify as jest.Mock).mockReturnValue(payload);
  return authenticate({ authorization: 'Bearer token' });
};

describe('authenticate email claim', () => {
  it('rejects a token without an email claim', async () => {
    expect(await authenticateWith(claims)).toBe(false);
  });

  it.each(['', '   ', null, 123])('rejects a token with an invalid email claim: %p', async (email) => {
    expect(await authenticateWith({ ...claims, email })).toBe(false);
  });

  it('returns a session for a token with an email claim', async () => {
    const session = await authenticateWith({ ...claims, email: 'user@gov.bc.ca' });
    expect(session).toMatchObject({ idir_userid: 'GUID', email: 'user@gov.bc.ca' });
  });
});

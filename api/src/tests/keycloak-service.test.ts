// @ts-nocheck
// Ignoring ts since test needs to frequently setup private class variables
import 'reflect-metadata';
import { KeycloakService } from '@/services/keycloak-service';
import AxiosMockAdapter from 'axios-mock-adapter';

const newAccessToken = 'newAccessToken';
const newRefreshToken = 'newRefreshToken';
const successResp = { access_token: newAccessToken, refresh_token: newRefreshToken };

const errorResp = {
  status: 500,
  data: { message: 'Internal Server Error' },
};

function generateFakeJWT(payload: Record<string, any>): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const base64Encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const encodedHeader = base64Encode(header);
  const encodedPayload = base64Encode(payload);
  return `${encodedHeader}.${encodedPayload}.signature`;
}

const tokenUrl = '/auth/realms/master/protocol/openid-connect/token';
const getClientUrl = '/auth/admin/realms/standard/clients?clientId=1';

describe('Keycloak Token Requests', () => {
  let originalAccessToken: string;
  let originalRefreshToken: string;
  let KeycloakClient: KeycloakService;
  let mockAxios: AxiosMockAdapter;

  beforeEach(() => {
    KeycloakClient = new KeycloakService();
    KeycloakClient.setEnvironment('dev');
    mockAxios = new AxiosMockAdapter(KeycloakClient.httpClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  const setupTokens = (accessTokenExpirySeconds, refreshTokenExpirySeconds) => {
    const now = Math.floor(Date.now() / 1000);
    KeycloakClient.accessToken = generateFakeJWT({ exp: now + accessTokenExpirySeconds });
    KeycloakClient.refreshToken = generateFakeJWT({ exp: now + refreshTokenExpirySeconds });
    originalRefreshToken = KeycloakClient.refreshToken;
    originalAccessToken = KeycloakClient.accessToken;
  };

  it('Uses the access token when still valid', async () => {
    setupTokens(300, 1800);
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.accessToken).toBe(originalAccessToken);
  });

  it('Refreshes the tokens when the access token is expired and the refresh token is valid', async () => {
    setupTokens(0, 1800);
    mockAxios.onPost(tokenUrl).reply(200, successResp);
    await KeycloakClient.getAccessToken();

    const callParams = new URLSearchParams(mockAxios.history.post[0].data);
    expect(callParams.get('grant_type')).toBe('refresh_token');

    expect(KeycloakClient.accessToken).toBe(newAccessToken);
    expect(KeycloakClient.refreshToken).toBe(newRefreshToken);
  });

  it('Requests a new token set when both current tokens are expired', async () => {
    setupTokens(0, 0);
    mockAxios.onPost(tokenUrl).reply(200, successResp);
    await KeycloakClient.getAccessToken();

    const callParams = new URLSearchParams(mockAxios.history.post[0].data);
    expect(callParams.get('grant_type')).toBe('password');

    expect(KeycloakClient.accessToken).toBe(newAccessToken);
    expect(KeycloakClient.refreshToken).toBe(newRefreshToken);
  });

  it('Resets the refreshing flag when token refresh fails', async () => {
    setupTokens(0, 1800);
    mockAxios.onPost(tokenUrl).reply(500);
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.refreshing).toBe(false);
  });

  it('Successfully refreshes tokens after a previous refresh failure', async () => {
    setupTokens(0, 1800);

    const tokenPost = mockAxios.onPost(tokenUrl);
    tokenPost.replyOnce(500);
    tokenPost.replyOnce(200, successResp);

    // On keycloak call failure tokens should not update
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.refreshToken).toBe(originalRefreshToken);
    expect(KeycloakClient.accessToken).toBe(originalAccessToken);

    // Follow-up call still updates the tokens
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.refreshToken).toBe(newRefreshToken);
    expect(KeycloakClient.accessToken).toBe(newAccessToken);
  });

  it('Handles token initialization failure', async () => {
    const tokenPost = mockAxios.onPost(tokenUrl);
    tokenPost.replyOnce(500);
    tokenPost.replyOnce(200, successResp);

    // Failed request left tokens in a null state
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.accessToken).toBe(null);
    expect(KeycloakClient.refreshToken).toBe(null);

    // Follow up request is still able to set them
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.accessToken).toBe(newAccessToken);
    expect(KeycloakClient.refreshToken).toBe(newRefreshToken);
  });

  it('Clears the cache and retries on a 401 error to keycloak', async () => {
    setupTokens(300, 1800);

    const tokenPost = mockAxios.onPost(tokenUrl);
    tokenPost.reply(401);

    mockAxios.onGet(getClientUrl).reply(401);
    await expect(KeycloakClient.getClient(1)).rejects.toThrow();

    // Should fetch a new token and retry on 401 failure, so 3 requests total.
    expect(mockAxios.history.length).toBe(3);

    // Should retry the get roles, so 2  GET requests
    const rolesRequests = mockAxios.history.filter((request) => request.url.endsWith(getClientUrl));
    expect(rolesRequests.length).toBe(2);

    // Should request a new token once, i.e. POST to /token
    const tokenRequests = mockAxios.history.filter((request) => request.url.endsWith(tokenUrl));
    expect(tokenRequests.length).toBe(1);
  });

  it('Only sends one request if there is no error', async () => {
    setupTokens(300, 1800);
    mockAxios.onGet(getClientUrl).reply(200, [{}]);
    await KeycloakClient.getClient(1);
    expect(mockAxios.history.length).toBe(1);
  });

  it('Only sends one request if a non 401 error is thrown', async () => {
    setupTokens(300, 1800);
    mockAxios.onGet(getClientUrl).reply(404);
    await expect(KeycloakClient.getClient(1)).rejects.toThrow();
    expect(mockAxios.history.length).toBe(1);
  });
});

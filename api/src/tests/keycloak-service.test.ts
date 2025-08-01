// @ts-nocheck
// Ignoring ts since test needs to frequently setup private class variables
import axios, { AxiosInstance } from 'axios';
import 'reflect-metadata';
import { KeycloakService } from '@/services/keycloak-service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    response: {
      use: jest.fn(),
    },
  },
} as unknown as AxiosInstance;
mockedAxios.create.mockReturnValue(mockAxiosInstance);

const newAccessToken = 'newAccessToken';
const newRefreshToken = 'newRefreshToken';
const successResp = {
  status: 200,
  data: { access_token: newAccessToken, refresh_token: newRefreshToken },
};

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

describe('Keycloak Token Requests', () => {
  let originalAccessToken: string;
  let originalRefreshToken: string;
  const KeycloakClient = new KeycloakService();
  KeycloakClient.setEnvironment('dev');

  const setupTokens = (accessTokenExpirySeconds, refreshTokenExpirySeconds) => {
    const now = Math.floor(Date.now() / 1000);
    KeycloakClient.accessToken = generateFakeJWT({ exp: now + accessTokenExpirySeconds });
    KeycloakClient.refreshToken = generateFakeJWT({ exp: now + refreshTokenExpirySeconds });
    originalRefreshToken = KeycloakClient.refreshToken;
    originalAccessToken = KeycloakClient.accessToken;
  };

  beforeEach(() => jest.resetAllMocks());

  it('Uses the access token when still valid', async () => {
    setupTokens(300, 1800);
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.accessToken).toBe(originalAccessToken);
  });

  it('Refreshes the tokens when the access token is expired and the refresh token is valid', async () => {
    setupTokens(0, 1800);
    mockAxiosInstance.post.mockResolvedValue(successResp);
    await KeycloakClient.getAccessToken();

    // Note calls[0] is the first call. calls[0][0] is the url, calls[0][1] is the params
    const callParams = mockAxiosInstance.post.mock.calls[0][1];
    expect(callParams.get('grant_type')).toBe('refresh_token');

    expect(KeycloakClient.accessToken).toBe(newAccessToken);
    expect(KeycloakClient.refreshToken).toBe(newRefreshToken);
  });

  it('Requests a new token set when both current tokens are expired', async () => {
    setupTokens(0, 0);
    mockAxiosInstance.post.mockResolvedValue(successResp);
    await KeycloakClient.getAccessToken();

    const callParams = mockAxiosInstance.post.mock.calls[0][1];
    expect(callParams.get('grant_type')).toBe('password');

    expect(KeycloakClient.accessToken).toBe(newAccessToken);
    expect(KeycloakClient.refreshToken).toBe(newRefreshToken);
  });

  it('Resets the refreshing flag when token refresh fails', async () => {
    setupTokens(0, 1800);
    mockAxiosInstance.post.mockRejectedValue(errorResp);
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.refreshing).toBe(false);
  });

  it('Successfully refreshes tokens after a previous refresh failure', async () => {
    setupTokens(0, 1800);

    // Reject once then resolve to new tokens
    mockAxiosInstance.post.mockRejectedValueOnce(errorResp).mockResolvedValueOnce(successResp);

    // On keycloak call failure tokens should not update
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.refreshToken).toBe(originalRefreshToken);
    expect(KeycloakClient.accessToken).toBe(originalAccessToken);

    // Follow-up call still updates the tokens
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.refreshToken).toBe(newRefreshToken);
    expect(KeycloakClient.accessToken).toBe(newAccessToken);
  });
});

describe('Token Initialization', () => {
  const KeycloakClient = new KeycloakService();
  KeycloakClient.setEnvironment('dev');

  it('Handles token initialization failure', async () => {
    mockAxiosInstance.post.mockRejectedValueOnce(errorResp).mockResolvedValueOnce(successResp);

    // Failed request left tokens in a null state
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.accessToken).toBe(null);
    expect(KeycloakClient.refreshToken).toBe(null);

    // Follow up request is still able to set them
    await KeycloakClient.getAccessToken();
    expect(KeycloakClient.accessToken).toBe(newAccessToken);
    expect(KeycloakClient.refreshToken).toBe(newRefreshToken);
  });
});

import { handleAxiosError, instance } from './axios';
import { getTokens, setTokens, removeTokens } from 'utils/store';
import { refreshSession } from 'utils/openid';
import { verifyToken } from 'utils/jwt';
import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { base_path } = publicRuntimeConfig;

export const getAuthHeader = async (): Promise<string> => {
  await refreshTokenIfExpiriesSoon();
  const tokens = getTokens();
  return `Bearer ${tokens.id_token}`;
};

export async function wakeItUp() {
  try {
    return instance.get('heartbeat', { headers: { skipAuth: true } }).then((res) => res.data);
  } catch (err: any) {
    return handleAxiosError(err);
  }
}

export async function verifyTokenWithAPI(idToken: string) {
  try {
    return await instance
      .get('verify-token', { headers: { skipAuth: true, Authorization: `Bearer ${idToken}` } })
      .then((res) => res.data);
  } catch (err: any) {
    return handleAxiosError(err);
  }
}

const ONE_MIN = 60 * 1000;
const TWO_MIN = 2 * ONE_MIN;

const refreshToken = async (tokens: any) => {
  const newTokens = await refreshSession({ refreshToken: tokens.refresh_token });
  const [newVerifiedIdToken] = await verifyToken(newTokens?.id_token);
  if (newVerifiedIdToken) {
    setTokens(newTokens);
  } else {
    removeTokens();
    console.error('failed to refresh the token');
    window.location.href = `${base_path}`;
  }
};

const refreshTokenIfExpiriesSoon = async () => {
  const tokens = getTokens();
  const [verifiedIdToken] = await verifyToken(tokens.id_token);
  if (verifiedIdToken) {
    const expiresIn = verifiedIdToken.exp * 1000 - Date.now();
    if (expiresIn < TWO_MIN) refreshToken(tokens);
  } else {
    refreshToken(tokens);
  }
};

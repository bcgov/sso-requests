import { instance } from './axios';
import { getTokens, setTokens, removeTokens } from 'utils/store';
import { refreshSession } from 'utils/openid';
import { verifyToken } from 'utils/jwt';

export const getAuthHeader = async (): Promise<string> => {
  await refreshTokenIfExpiriesSoon();
  const tokens = getTokens();
  return `Bearer ${tokens.id_token}`;
};

export async function wakeItUp() {
  try {
    const data = await instance.get('heartbeat', { headers: { skipAuth: true } }).then((res) => res.data);
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function verifyTokenWithAPI(idToken: string) {
  try {
    return instance
      .get('verify-token', { headers: { skipAuth: true, Authorization: `Bearer ${idToken}` } })
      .then((res) => res.data);
  } catch (err) {
    console.error(err);
    return null;
  }
}

const ONE_MIN = 60 * 1000;
const TWO_MIN = 2 * ONE_MIN;

const refreshToken = async (tokens: any) => {
  const newTokens = await refreshSession({ refreshToken: tokens.refresh_token });
  const newVerifiedIdToken = await verifyToken(newTokens?.id_token);
  if (newVerifiedIdToken) {
    setTokens(newTokens);
  } else {
    removeTokens();
    console.error('failed to refresh the token');
    window.location.href = '/';
  }
};

const refreshTokenIfExpiriesSoon = async () => {
  const tokens = getTokens();
  const verifiedIdToken = await verifyToken(tokens.id_token);
  if (verifiedIdToken) {
    const expiresIn = verifiedIdToken.exp * 1000 - Date.now();
    if (expiresIn < TWO_MIN) refreshToken(tokens);
  } else {
    refreshToken(tokens);
  }
};

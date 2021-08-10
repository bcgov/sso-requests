import { instance } from './axios';
import { setTokens, getTokens, removeTokens } from 'utils/store';

export const getAuthConfig = () => {
  const tokens = getTokens();
  const config = { headers: { Authorization: `Bearer ${tokens.id_token}` } };
  return config;
};

export async function wakeItUp() {
  try {
    const config = getAuthConfig();
    const data = await instance.get('heartbeat', config).then((res) => res.data);

    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

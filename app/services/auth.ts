import { instance } from './axios';

const TOKEN_SESSION = 'tokens';

export const getAuthConfig = () => {
  const tokens = JSON.parse(sessionStorage.getItem(TOKEN_SESSION) || '{}') || {};
  const config = { headers: { Authorization: `Bearer ${tokens.id_token}` } };
  return config;
};

export async function fetchInfo() {
  try {
    const config = getAuthConfig();
    const data = await instance.get('/api/info', config).then((res) => res.data);

    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

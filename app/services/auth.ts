import { instance } from './axios';

const TOKEN_SESSION = 'tokens';

export async function fetchInfo() {
  try {
    const tokens = JSON.parse(sessionStorage.getItem(TOKEN_SESSION) || '') || {};
    const config = { headers: { Authorization: `Bearer ${tokens.id_token}` } };
    const data = await instance.get('/api/info', config).then((res) => res.data);

    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

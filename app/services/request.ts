import { instance } from './axios';
import { Data } from 'interfaces/form';
import { getAuthConfig } from './auth';

export const submitRequest = async (data: Data) => {
  const config = getAuthConfig();
  try {
    await instance.post('requests', data, config).then((res) => res.data);
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getRequests = async () => {
  const config = getAuthConfig();
  try {
    const results = await instance.get('requests', config).then((res) => res.data);
    return results;
  } catch (err) {
    console.error(err);
    return null;
  }
};

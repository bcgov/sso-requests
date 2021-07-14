import { instance } from './axios';
import { Data } from 'interfaces/form';
import { getAuthConfig } from './auth';
import requestsMockup from 'mock-data/requests';

export const createRequest = async (data: Data) => {
  const config = getAuthConfig();
  try {
    const result = await instance.post('requests', data, config).then((res) => res.data);
    return result;
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

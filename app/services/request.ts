import { instance } from './axios';
import { Data } from '../../shared/interfaces';

export const submitRequest = async (data: Data) => {
  try {
    await instance.post('requests', data).then((res) => res.data);
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getRequests = async () => {
  try {
    const results = await instance.get('requests').then((res) => res.data);
    return results;
  } catch (err) {
    console.error(err);
    return null;
  }
};

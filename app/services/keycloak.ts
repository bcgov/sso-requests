import { instance } from './axios';

export const getInstallation = async (requestId: number, environment: string) => {
  try {
    const result = await instance.post('installation', { requestId, environment }).then((res) => res.data);
    return [result, null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

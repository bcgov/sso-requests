import { instance } from './axios';
import { handleAxiosError } from 'services/axios';
import { AxiosError } from 'axios';

export const fetchDiscussions = async (): Promise<[any, null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('github/discussions', { headers: { skipAuth: true } }).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

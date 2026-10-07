import { instance } from './axios';
import { Division } from 'interfaces/Request';
import { handleAxiosError } from 'services/axios';
import { AxiosError } from 'axios';

export const listDivisions = async (): Promise<[Division[], null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('divisions').then((res) => res.data);

    return [result?.data ?? [], null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

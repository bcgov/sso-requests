import { instance } from './axios';
import { BcgovUnit } from 'interfaces/Request';
import { handleAxiosError } from 'services/axios';
import { AxiosError } from 'axios';

export const listBcgovUnits = async (): Promise<[BcgovUnit[], null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('bcgov-units').then((res) => res.data);

    return [result?.data ?? [], null];
  } catch (err: any) {
    console.error('Error listing bcgov units:', err);
    return handleAxiosError(err);
  }
};

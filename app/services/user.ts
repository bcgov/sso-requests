import { instance } from './axios';
import { AxiosError } from 'axios';
import { Team, User } from 'interfaces/team';
import { handleAxiosError } from 'services/axios';

export const getProfile = async (): Promise<[User, null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('me').then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const updateProfile = async (data: {
  additionalEmail?: string;
  hasReadGoldNotification?: boolean;
}): Promise<[User, null] | [null, AxiosError]> => {
  try {
    const result = await instance.post('me', data).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

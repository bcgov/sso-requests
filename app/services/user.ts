import { SurveyData } from '@app/interfaces/Survey';
import { instance } from './axios';
import { AxiosError } from 'axios';
import { User, UserSurveyInformation } from 'interfaces/team';
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
  surveySubmissions?: UserSurveyInformation;
}): Promise<[User, null] | [null, AxiosError]> => {
  try {
    const result = await instance.post('me', data).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const submitSurvey = async (surveyData: SurveyData): Promise<[null, null] | [null, AxiosError]> => {
  try {
    await instance.post('surveys', {
      message: surveyData.message,
      rating: surveyData.rating,
      triggerEvent: surveyData.triggerEvent,
    });
    return [null, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

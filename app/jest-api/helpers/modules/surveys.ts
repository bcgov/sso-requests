import { testClient } from '../test-client';
import { API_BASE_PATH } from '../constants';
import surveysHandler from '@app/pages/api/surveys';

export const createSurvey = async (data: { rating: number; message: string; triggerEvent: string }) => {
  return await testClient(surveysHandler).post(`${API_BASE_PATH}/surveys`).send(data).set('Accept', 'application/json');
};

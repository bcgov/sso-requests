import app from '../../helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from '../constants';

export const createSurvey = async (data: { rating: number; message: string; triggerEvent: string }) => {
  return await supertest(app).post(`${APP_BASE_PATH}/surveys`).send(data).set('Accept', 'application/json');
};

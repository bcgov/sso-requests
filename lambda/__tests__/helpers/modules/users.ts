import app from '../../helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from '../constants';

export const getAuthenticatedUser = async () => {
  return await supertest(app).get(`${APP_BASE_PATH}/me`);
};

export const deleteInactiveUsers = async (userData: any) => {
  return await supertest(app)
    .post(`${APP_BASE_PATH}/delete-inactive-idir-users`)
    .send(userData)
    .set('Accept', 'application/json')
    .set('Authorization', 'test');
};

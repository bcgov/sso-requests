import app from '../../helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from '../constants';

export const getAuthenticatedUser = async () => {
  return await supertest(app).get(`${APP_BASE_PATH}/me`);
};

export const deleteInactiveUsers = async (userId: string) => {
  return await supertest(app)
    .delete(`${APP_BASE_PATH}/users/${userId}`)
    .set('Accept', 'application/json')
    .set('Authorization', 'test');
};

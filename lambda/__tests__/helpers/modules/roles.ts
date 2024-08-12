import app from '../../helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from '../constants';
import { IntegrationData, QUEUE_ACTION } from '@lambda-shared/interfaces';
import { models } from '@lambda-shared/sequelize/models/models';

export const listClientRoles = async (integrationId: number) => {
  return await supertest(app)
    .post(`${APP_BASE_PATH}/keycloak/roles`)
    .send({
      environment: 'dev',
      integrationId,
      search: '',
      first: 0,
      max: 50,
    })
    .set('Accept', 'application/json');
};

export const listClientCompositeRoles = async (integrationId: number, roleName: string) => {
  return await supertest(app)
    .post(`${APP_BASE_PATH}/keycloak/get-composite-roles`)
    .send({
      environment: 'dev',
      integrationId,
      roleName,
    })
    .set('Accept', 'application/json');
};

export const listClientRoleUsers = async (integrationId: number, roleName: string) => {
  return await supertest(app)
    .post(`${APP_BASE_PATH}/keycloak/role-users`)
    .send({
      environment: 'dev',
      integrationId,
      roleName,
      first: 0,
      max: 50,
    })
    .set('Accept', 'application/json');
};

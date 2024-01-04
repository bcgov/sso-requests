import app from '../../helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from '../constants';
import { IntegrationData } from '@lambda-shared/interfaces';
import { models } from '@lambda-shared/sequelize/models/models';
import { QUEUE_ACTION } from '@lambda-shared/interfaces';

export const createIntegration = async (data: IntegrationData = {}) => {
  return await supertest(app).post(`${APP_BASE_PATH}/requests`).send(data).set('Accept', 'application/json');
};

export const getIntegration = async (requestId: number) => {
  return await supertest(app).post(`${APP_BASE_PATH}/request`).send({ requestId }).set('Accept', 'application/json');
};

export const getIntegrations = async () => {
  return await supertest(app).get(`${APP_BASE_PATH}/requests`);
};

export const getListOfIntegrations = async () => {
  return await supertest(app).post(`${APP_BASE_PATH}/requests-all`);
};

export const updateIntegration = async (data: IntegrationData, submit: boolean = false) => {
  return await supertest(app)
    .put(`${APP_BASE_PATH}/requests${submit ? '?submit=true' : ''}`)
    .send(data)
    .set('Accept', 'application/json');
};

export const createBulkRoles = async (data: { integrationId: number; roles: { name: string; envs: string[] }[] }) => {
  return await supertest(app).post(`${APP_BASE_PATH}/keycloak/bulk-roles`).send(data).set('Accept', 'application/json');
};

export const deleteRole = async (data: { integrationId: number; roleName: string; environment: string }) => {
  return await supertest(app)
    .post(`${APP_BASE_PATH}/keycloak/delete-role`)
    .send(data)
    .set('Accept', 'application/json');
};

export const createCompositeRoles = async (data: {
  integrationId: number;
  roleName: string;
  environment: string;
  compositeRoleNames: string[];
}) => {
  return await supertest(app)
    .post(`${APP_BASE_PATH}/keycloak/set-composite-roles`)
    .send(data)
    .set('Accept', 'application/json');
};

export const deleteIntegration = async (integrationId: number) => {
  return await supertest(app).del(`${APP_BASE_PATH}/requests?id=${integrationId}`);
};

export const restoreIntegration = async (integrationId: number) => {
  return await supertest(app).get(`${APP_BASE_PATH}/requests/${integrationId}/restore`);
};

export const fetchMetrics = async (integrationId: number, fromDate: string, toDate: string, env: string) => {
  return await supertest(app).get(
    `${APP_BASE_PATH}/requests/${integrationId}/metrics?fromDate=${fromDate}&toDate=${toDate}&env=${env}`,
  );
};

export const createRequestQueueItem = async (requestId: number, requestData: IntegrationData, action: QUEUE_ACTION) => {
  return models.requestQueue.create({ type: 'request', action, requestId, request: requestData });
};

export const getQueueItems = async () => models.requestQueue.findAll();

export const getRequest = async (id: number) => models.request.findOne({ where: { id } });

export const generateRequest = async (data: IntegrationData) => models.request.create(data);

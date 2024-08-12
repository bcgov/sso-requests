import app from '../../helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from '../constants';
import { IntegrationData, QUEUE_ACTION } from '@lambda-shared/interfaces';
import { models } from '@lambda-shared/sequelize/models/models';

export const createIntegration = async (data: IntegrationData = {}) => {
  return await supertest(app).post(`${APP_BASE_PATH}/requests`).send(data).set('Accept', 'application/json');
};

export const getIntegration = async (requestId: number) => {
  return await supertest(app).post(`${APP_BASE_PATH}/request`).send({ requestId }).set('Accept', 'application/json');
};

export const getIntegrations = async () => {
  return await supertest(app).get(`${APP_BASE_PATH}/requests`);
};

export const getListOfIntegrations = async (data?: { searchField: string[]; searchKey: string }) => {
  return await supertest(app).post(`${APP_BASE_PATH}/requests-all`).send(data);
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

export const restoreIntegration = async (integrationId: number, email?: string) => {
  return await supertest(app).post(`${APP_BASE_PATH}/requests/${integrationId}/restore`).send({ email });
};

export const fetchMetrics = async (integrationId: number, fromDate: string, toDate: string, env: string) => {
  return await supertest(app).get(
    `${APP_BASE_PATH}/requests/${integrationId}/metrics?fromDate=${fromDate}&toDate=${toDate}&env=${env}`,
  );
};

interface RequestData extends IntegrationData {
  existingClientId?: string;
}

export const createRequestQueueItem = async (
  requestId: number,
  requestData: RequestData,
  action: QUEUE_ACTION,
  ageSeconds?: number,
) => {
  const queueItem: any = { type: 'request', action, requestId, request: requestData };
  if (ageSeconds) {
    const currentTime = new Date();
    const secondsAgoTime = currentTime.getTime() - ageSeconds * 1000;
    queueItem.createdAt = new Date(secondsAgoTime);
  }
  return models.requestQueue.create(queueItem);
};

export const getQueueItems = async () => models.requestQueue.findAll();

export const getRequest = async (id: number) => models.request.findOne({ where: { id } });

export const generateRequest = async (data: IntegrationData) => {
  if (data.userId) {
    await models.user.findOrCreate({
      where: { id: data.userId },
      defaults: {
        idirEmail: 'mail',
      },
    });
  }
  return models.request.create(data);
};

export const getEventsByRequestId = async (id: number) => models.event.findAll({ where: { requestId: id } });

export const submitNewIntegration = async (integration: IntegrationData) => {
  const { projectName, projectLead, serviceType, usesTeam } = integration;
  const {
    body: { id },
  } = await supertest(app)
    .post(`${APP_BASE_PATH}/requests`)
    .send({
      projectName,
      projectLead,
      serviceType,
      usesTeam,
    })
    .set('Accept', 'application/json');

  return supertest(app)
    .put(`${APP_BASE_PATH}/requests?submit=true`)
    .send({ ...integration, id })
    .set('Accept', 'application/json');
};

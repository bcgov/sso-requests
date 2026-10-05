import { testClient } from '../test-client';
import { API_BASE_PATH } from '../constants';
import { IntegrationData } from '@app/shared/interfaces';
import { models } from '@app/shared/sequelize/models/models';
import requestsHandler from '@app/pages/api/requests';
import requestMetricsHandler from '@app/pages/api/requests/[id]/metrics';
import requestsRestoreHandler from '@app/pages/api/requests/[id]/restore';
import requestsEventHandler from '@app/pages/api/requests/[id]/events';
import requestHandler from '@app/pages/api/request';
import requestsAllHandler from '@app/pages/api/requests-all';
import kcBulkRolesHandler from '@app/pages/api/keycloak/bulk-roles';
import kcSetCompRolesHandler from '@app/pages/api/keycloak/set-composite-roles';
import kcDelRolesHandler from '@app/pages/api/keycloak/delete-role';
import eventsHandler from '@app/pages/api/events';

export const createIntegration = async (data: IntegrationData = {}) => {
  return await testClient(requestsHandler)
    .post(`${API_BASE_PATH}/requests`)
    .send(data)
    .set('Accept', 'application/json');
};

export const getIntegration = async (requestId: number) => {
  return await testClient(requestHandler)
    .post(`${API_BASE_PATH}/request`)
    .send({ requestId })
    .set('Accept', 'application/json');
};

export const getIntegrations = async () => {
  return await testClient(requestsHandler).get(`${API_BASE_PATH}/requests`);
};

export const getListOfIntegrations = async (data?: { searchField: string[]; searchKey: string }) => {
  return await testClient(requestsAllHandler)
    .post(`${API_BASE_PATH}/requests-all`)
    .send(data)
    .set('Accept', 'application/json');
};

export const updateIntegration = async (data: IntegrationData, submit: boolean = false) => {
  return await testClient(requestsHandler)
    .put(`${API_BASE_PATH}/requests${submit ? '?submit=true' : ''}`)
    .send(data)
    .set('Accept', 'application/json');
};

export const createBulkRoles = async (data: { integrationId: number; roles: { name: string; envs: string[] }[] }) => {
  return await testClient(kcBulkRolesHandler)
    .post(`${API_BASE_PATH}/keycloak/bulk-roles`)
    .send(data)
    .set('Accept', 'application/json');
};

export const deleteRole = async (data: { integrationId: number; roleName: string; environment: string }) => {
  return await testClient(kcDelRolesHandler)
    .post(`${API_BASE_PATH}/keycloak/delete-role`)
    .send(data)
    .set('Accept', 'application/json');
};

export const createCompositeRoles = async (data: {
  integrationId: number;
  roleName: string;
  environment: string;
  compositeRoleNames: string[];
}) => {
  return await testClient(kcSetCompRolesHandler)
    .post(`${API_BASE_PATH}/keycloak/set-composite-roles`)
    .send(data)
    .set('Accept', 'application/json');
};

export const deleteIntegration = async (integrationId: number) => {
  return await testClient(requestsHandler).delete(`${API_BASE_PATH}/requests?id=${integrationId}`);
};

export const restoreIntegration = async (integrationId: number, email?: string) => {
  return await testClient(requestsRestoreHandler)
    .post(`${API_BASE_PATH}/requests/${integrationId}/restore`)
    .send({ email });
};

export const fetchMetrics = async (integrationId: number, fromDate: string, toDate: string, env: string) => {
  return await testClient(requestMetricsHandler).get(
    `${API_BASE_PATH}/requests/${integrationId}/metrics?fromDate=${fromDate}&toDate=${toDate}&env=${env}`,
  );
};

export const getWorkflows = async () => models.requestWorkflow.findAll({ order: [['createdAt', 'ASC']], raw: true });

export const getWorkflowForRequest = async (requestId: number) =>
  models.requestWorkflow.findOne({ where: { requestId }, order: [['createdAt', 'DESC']], raw: true });

export const getWorkflowSteps = async (requestWorkflowId: string) =>
  models.requestWorkflowStep.findAll({ where: { requestWorkflowId }, order: [['sequence', 'ASC']], raw: true });

export const getWorkflowStep = async (requestWorkflowId: string, name: string) =>
  models.requestWorkflowStep.findOne({ where: { requestWorkflowId, name }, raw: true });

export const getDeadLetters = async () => models.requestWorkflowFailure.findAll({ raw: true });

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
  } = await testClient(requestsHandler)
    .post(`${API_BASE_PATH}/requests`)
    .send({
      projectName,
      projectLead,
      serviceType,
      usesTeam,
    })
    .set('Accept', 'application/json');

  // The shared fixtures carry a clientId for the tests that write rows directly. A new
  // integration's client id is generated on submission, and setting one needs
  // integrations:write-client-id, so it is not part of what a user submits.
  const { clientId, ...payload } = integration;
  return testClient(requestsHandler)
    .put(`${API_BASE_PATH}/requests?submit=true`)
    .send({ ...payload, id })
    .set('Accept', 'application/json');
};

export const getRequestsForAdmins = async () => {
  return await testClient(requestsAllHandler)
    .post(`${API_BASE_PATH}/requests-all`)
    .send({
      searchField: ['id', 'projectName', 'clientId'],
      searchKey: '',
      order: [
        ['updatedAt', 'desc'],
        ['status', 'desc'],
      ],
      limit: 5,
      page: 1,
      status: [],
      archiveStatus: [],
      realms: null,
      environments: null,
      types: ['gold'],
      devIdps: null,
    })
    .set('Accept', 'application/json');
};

export const getEvents = async (requestId: number, eventCode: string = 'all') => {
  return await testClient(eventsHandler)
    .post(`${API_BASE_PATH}/events`)
    .send({
      requestId,
      eventCode,
    })
    .set('Accept', 'application/json');
};

export const getRequestScopedEvents = async (requestId: number) => {
  return await testClient(requestsEventHandler)
    .get(`${API_BASE_PATH}/requests/${requestId}/events`)
    .set('Accept', 'application/json');
};

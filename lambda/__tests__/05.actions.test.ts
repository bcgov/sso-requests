import {
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  putIntegrationBatchPr,
  getUpdateIntegrationData,
  getCreateIntegrationData,
} from './helpers/fixtures';
import { createIntegration, getIntegration, updateIntegration } from './helpers/modules/integrations';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { models } from '@lambda-shared/sequelize/models/models';
import { getActionsApiHeartBeat } from './helpers/modules/common';
import { getPlannedIntegrations, updateIntegrationPrDetails, updateIntegrationsApply } from './helpers/modules/actions';
import { Integration } from 'app/interfaces/Request';

jest.mock('../app/src/authenticate');

jest.mock('../actions/src/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve(true);
    }),
  };
});

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('../app/src/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => true),
  };
});

jest.mock('../actions/src/github', () => {
  return {
    mergePR: jest.fn(),
  };
});

describe('create/manage integrations by authenticated user', () => {
  try {
    const projectName: string = 'Test Integration';
    let integration: Integration;
    beforeAll(async () => {
      jest.clearAllMocks();
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const createIntRes = await createIntegration(getCreateIntegrationData({ projectName }));
      integration = createIntRes.body;
      await updateIntegration(getUpdateIntegrationData({ integration }), true);
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });

    it('should wake up the actions api', async () => {
      const result = await getActionsApiHeartBeat();
      expect(result.status).toEqual(200);
    });

    it('should validate the integration status to be in submitted state', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await getIntegration(integration.id);
      expect(result.status).toEqual(200);
      expect(result.body.id).toEqual(integration.id);
      expect(result.body.status).toEqual('submitted');
    });

    it('should update the pr number and status of a request after creating a pull request', async () => {
      const data = putIntegrationBatchPr;
      const result = await updateIntegrationPrDetails({ ...data, id: integration.id });
      expect(result.status).toEqual(200);
      expect(result.body).toEqual(true);
      const intRes = await getIntegration(integration.id);
      expect(Number(intRes.body.prNumber)).toEqual(data.prNumber);
      expect(Number(intRes.body.actionNumber)).toEqual(data.actionNumber);
      const planEvent = await models.event.findOne({
        where: { requestId: integration.id, eventCode: 'request-plan-success' },
      });
      expect(planEvent.eventCode).toBe('request-plan-success');
    });

    it('should fetch all the integrations in planned state', async () => {
      const result = await getPlannedIntegrations();
      expect(result.status).toEqual(200);
      expect(result.body.length).toEqual(1);
      expect(result.body[0]).toEqual(integration.id);
    });

    it('should update the status when terraform apply is successful and save the event', async () => {
      const result = await updateIntegrationsApply({ ids: [integration.id], success: true });
      expect(result.status).toEqual(200);
      expect(result.body).toEqual(true);
      const intRes = await getIntegration(integration.id);
      expect(intRes.body.status).toEqual('applied');
      const applyEvent = await models.event.findOne({
        where: { requestId: integration.id, eventCode: 'request-apply-success' },
      });
      expect(applyEvent.eventCode).toBe('request-apply-success');
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});

import app from '../../helpers/server';
import supertest from 'supertest';
import { ACTIONS_BASE_PATH } from '../constants';

export const updateIntegrationPrDetails = async (data: {
  id: number;
  actionNumber: number;
  repoOwner: string;
  repoName: string;
  prNumber: number;
  success: boolean;
  changes: Object;
  isEmpty: boolean;
  isAllowedToMerge: boolean;
}) => {
  return await supertest(app).put(`${ACTIONS_BASE_PATH}/batch/pr`).send(data).set('Accept', 'application/json');
};

export const getPlannedIntegrations = async (serviceType: string = 'gold') => {
  return await supertest(app).get(`${ACTIONS_BASE_PATH}/batch/items/${serviceType}`);
};

export const updateIntegrationsApply = async (data: { ids: number[]; success: boolean }) => {
  return await supertest(app).put(`${ACTIONS_BASE_PATH}/batch/items`).send(data).set('Accept', 'application/json');
};

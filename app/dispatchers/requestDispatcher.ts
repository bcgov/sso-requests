import type { Action } from 'reducers/dashboardReducer';
import { Request } from 'interfaces/Request';
import { Team } from 'interfaces/team';

export const $setRequests = (payload: Request[]): Action => {
  return { type: 'setRequests', payload };
};

export const $setEditingRequest = (payload: boolean): Action => {
  return { type: 'setEditingRequest', payload };
};

export const $updateRequest = (payload: Request | null): Action => {
  return { type: 'updateRequest', payload };
};

export const $deleteRequest = (payload: number | null): Action => {
  return { type: 'deleteRequest', payload };
};

export const $setTeams = (payload: Team[] | null): Action => {
  return { type: 'setTeams', payload };
};

export const $setDownloadError = (payload: boolean | null): Action => {
  return { type: 'setDownloadError', payload };
};

export const $setActiveRequestId = (payload?: number): Action => {
  return { type: 'setActiveRequestId', payload };
};

export const $setActiveTeamId = (payload?: number): Action => {
  return { type: 'setActiveTeamId', payload };
};

export const $setTableTab = (payload?: string): Action => {
  return { type: 'setTableTab', payload };
};

export const $setPanelTab = (payload?: string): Action => {
  return { type: 'setPanelTab', payload };
};

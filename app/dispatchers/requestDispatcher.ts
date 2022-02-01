import type { Action } from 'reducers/dashboardReducer';
import { Request } from 'interfaces/Request';
import { Team } from 'interfaces/team';

export const $setRequests = (payload: Request[]): Action => {
  return { type: 'setRequests', payload };
};

export const $updateRequest = (payload: Request | null): Action => {
  return { type: 'updateRequest', payload };
};

export const $deleteRequest = (payload: number | null): Action => {
  return { type: 'deleteRequest', payload };
};

export const $setRequestToDelete = (payload: number | null): Action => {
  return { type: 'setRequestIdToDelete', payload };
};

export const $setTeamIdToDelete = (payload: number | null): Action => {
  return { type: 'setTeamIdToDelete', payload };
};
// TODO FIX THIS TO INCLUDE THE CORRECT PAYLOAD
export const $setTeamIdToEdit = (payload: number | null): Action => {
  // console.log(`Edit dispatch called with payload: ${payload}`)
  return { type: 'setTeamIdToEdit', payload };
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

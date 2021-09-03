import type { Action } from 'reducers/requestReducer';
import { Request } from 'interfaces/Request';

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

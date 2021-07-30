import type { Action } from 'reducers/requestReducer';
import { Request } from 'interfaces/Request';

export const $setRequests = (payload: Request[]): Action => {
  return { type: 'setRequests', payload };
};

export const $setRequest = (payload?: Request): Action => {
  return { type: 'setRequest', payload };
};

export const $setEditingRequest = (payload: boolean): Action => {
  return { type: 'setEditingRequest', payload };
};

export const $setUpdatingUrls = (payload: boolean): Action => {
  return { type: 'setUpdatingUrls', payload };
};

export const $updateRequest = (payload: Request | null): Action => {
  return { type: 'updateRequest', payload };
};

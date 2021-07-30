import type { Action } from 'reducers/requestReducer';
import { ClientRequest } from 'interfaces/Request';

export const $setRequests = (payload: ClientRequest[]): Action => {
  return { type: 'setRequests', payload };
};

export const $setRequest = (payload?: ClientRequest): Action => {
  return { type: 'setRequest', payload };
};

export const $setEditingRequest = (payload: boolean): Action => {
  return { type: 'setEditingRequest', payload };
};

export const $setUpdatingUrls = (payload: boolean): Action => {
  return { type: 'setUpdatingUrls', payload };
};

export const $updateRequest = (payload: ClientRequest | null): Action => {
  return { type: 'updateRequest', payload };
};

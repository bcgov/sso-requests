import type { Action } from 'reducers/requestReducer';

export const $setRequests = (payload: any): Action => {
  return { type: 'setRequests', payload };
};

export const $setRequest = (payload: any): Action => {
  return { type: 'setRequest', payload };
};

export const $setEditingRequest = (payload: any): Action => {
  return { type: 'setEditingRequest', payload };
};

export const $setUpdatingUrls = (payload: any): Action => {
  return { type: 'setUpdatingUrls', payload };
};

export const $updateRequest = (payload: any): Action => {
  return { type: 'updateRequest', payload };
};

import type { Action } from 'reducers/dashboardReducer';

export const $setDownloadError = (payload: boolean | null): Action => {
  return { type: 'setDownloadError', payload };
};

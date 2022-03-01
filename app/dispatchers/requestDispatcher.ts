import type { Action } from 'reducers/dashboardReducer';

export const $setDownloadError = (payload: boolean | null): Action => {
  return { type: 'setDownloadError', payload };
};

export const $setPanelTab = (payload?: string): Action => {
  return { type: 'setPanelTab', payload };
};

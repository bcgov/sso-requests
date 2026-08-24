import type { Session } from '@app/shared/interfaces';
import { instance } from './axios';

export const listSdxResourceServers = async (session: Session) => {
  try {
    const result = await instance.get('/sdx-resource-servers').then((res) => res.data);
    return [result, null];
  } catch (err) {
    return [null, err];
  }
};

export const getSdxAllowedAccessForClient = async (session: Session, requestId: number, status: string) => {
  try {
    const result = await instance
      .get(`/requests/${requestId}/sdx-allowed-access?status=${status}`)
      .then((res) => res.data);
    return [result, null];
  } catch (err) {
    return [null, err];
  }
};

export const getSdxSubsytemStatus = async (requestId: number) => {
  try {
    const result = await instance.get(`/requests/${requestId}/sdx-status`).then((res) => res.data);
    return [result, null];
  } catch (err) {
    return [null, err];
  }
};

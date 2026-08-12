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
    const result = await instance.get(`/requests/${requestId}/sdx-requests/${status}`).then((res) => res.data);
    return [result, null];
  } catch (err) {
    return [null, err];
  }
};

export const createSdxRequest = async (session: Session, requestId: number, sdxRequestData: any) => {
  try {
    const result = await instance.post(`/requests/${requestId}/sdx-requests`, sdxRequestData).then((res) => res.data);
    return [result, null];
  } catch (err) {
    return [null, err];
  }
};

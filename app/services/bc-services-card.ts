import { BcscPrivacyZone, BcscAttribute } from '@app/interfaces/types';
import { bcscPrivacyZones, bcscAttributes } from '@app/utils/constants';
import { instance } from './axios';
import { AxiosError } from 'axios';

export const fetchPrivacyZones = async (): Promise<[BcscPrivacyZone[], null] | [null, AxiosError]> => {
  try {
    let result = await instance.get(`bc-services-card/privacy-zones`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return [bcscPrivacyZones(), null];
  }
};

export const fetchAttributes = async (): Promise<[BcscAttribute[], null] | [null, AxiosError]> => {
  try {
    let result = await instance.get('bc-services-card/claim-types').then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return [bcscAttributes(), null];
  }
};

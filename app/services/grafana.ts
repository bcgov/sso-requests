import { instance } from './axios';

export const getAggregatedDataByClientId = async (clientId: string, env: string) => {
  try {
    const result = await instance
      .get(`grafana/aggregatedEventMetrics/${clientId}/${env}`)
      .then((res: any) => res?.data);
    return [result, null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

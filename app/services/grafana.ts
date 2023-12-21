import { instance } from './axios';

export const getMetrics = async (id: number, env: string, fromDate?: string, toDate?: string) => {
  try {
    const result = await instance
      .get(`requests/${id}/metrics?env=${env}&fromDate=${fromDate}&toDate=${toDate}`)
      .then((res: any) => res?.data);

    return [result, null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

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

export const getLogs = async (
  id: number,
  env: string,
  fromDate: Date,
  toDate: Date,
  onProgress: (progressEvent: ProgressEvent) => void,
  controller?: AbortController,
) => {
  try {
    const result = await instance({
      url: `requests/${id}/logs?env=${env}&start=${fromDate}&end=${toDate}`,
      method: 'GET',
      responseType: 'blob',
      onDownloadProgress: onProgress,
      signal: controller?.signal,
    }).then((res: any) => res?.data);

    return [result, null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

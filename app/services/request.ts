import { instance } from './axios';
import { Data } from 'interfaces/form';
import { getAuthConfig } from './auth';
import { Request } from 'interfaces/Request';
import requestsMockup from 'mock-data/requests';

const processRequest = (v: any) => {
  return v;
};

const prepareRequest = (v: any) => {
  return v;
};

export const createRequest = async (data: Data) => {
  const config = getAuthConfig();
  try {
    const result = await instance.post('requests', { publicAccess: false, ...data }, config).then((res) => res.data);
    return processRequest(result);
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getRequest = async (requestId: number): Promise<Request | null> => {
  const config = getAuthConfig();
  try {
    const result = await instance.post('request', { requestId }, config).then((res) => res.data);
    return processRequest(result);
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getRequests = async () => {
  const config = getAuthConfig();
  try {
    const results = await instance.get('requests', config).then((res) => res.data);
    return results.map(processRequest);
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const updateRequest = async (data: Data, submit = false) => {
  data = prepareRequest(data);
  const config = getAuthConfig();

  try {
    const url = submit ? `requests?submit=true` : 'requests';
    const result = await instance.put(url, data, config).then((res) => res.data);
    return processRequest(result);
  } catch (err) {
    console.error(err);
    return null;
  }
};

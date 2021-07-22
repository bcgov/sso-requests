import { instance } from './axios';
import { getAuthConfig } from './auth';
import { ServerRequest, ClientRequest } from 'interfaces/Request';
import requestsMockup from 'mock-data/requests';
import { processRequest, prepareRequest } from 'utils/helpers';

export const createRequest = async (data: ClientRequest) => {
  const config = getAuthConfig();
  const preparedData = prepareRequest(data);

  try {
    const result = await instance.post('requests', { ...preparedData }, config).then((res) => res.data);
    return processRequest(result);
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getRequest = async (requestId: number): Promise<ClientRequest | null> => {
  const config = getAuthConfig();
  try {
    const result: ServerRequest = await instance.post('request', { requestId }, config).then((res) => res.data);
    return processRequest(result);
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getRequests = async () => {
  const config = getAuthConfig();
  try {
    const results: ServerRequest[] = await instance.get('requests', config).then((res) => res.data);
    return results
      .map((v) => {
        v.status = 'applied';
        return v;
      })
      .map(processRequest);
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const updateRequest = async (data: ClientRequest, previousData?: ClientRequest, submit = false) => {
  const preparedData = prepareRequest(data, previousData);
  const config = getAuthConfig();

  try {
    const url = submit ? `requests?submit=true` : 'requests';
    const result = await instance.put(url, preparedData, config).then((res) => res.data);
    return processRequest(result);
  } catch (err) {
    console.error(err);
    return null;
  }
};

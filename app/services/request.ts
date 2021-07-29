import { instance } from './axios';
import { getAuthConfig } from './auth';
import { ServerRequest, ClientRequest } from 'interfaces/Request';
import requestsMockup from 'mock-data/requests';
import { processRequest, prepareRequest } from 'utils/helpers';

export const createRequest = async (data: ClientRequest): Promise<[ClientRequest, null] | [null, Error]> => {
  const config = getAuthConfig();

  try {
    const result = await instance.post('requests', data, config).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

export const getRequest = async (requestId: number): Promise<[ClientRequest, null] | [null, Error]> => {
  const config = getAuthConfig();
  try {
    const result: ServerRequest = await instance.post('request', { requestId }, config).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

export const getRequests = async (): Promise<[ClientRequest[], null] | [null, Error]> => {
  const config = getAuthConfig();
  try {
    const results: ServerRequest[] = await instance.get('requests', config).then((res) => res.data);
    return [
      results
        .map((v) => {
          v.status = 'applied';
          return v;
        })
        .map(processRequest),
      null,
    ];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

export const updateRequest = async (
  data: ClientRequest,
  submit = false,
): Promise<[ClientRequest, null] | [null, Error]> => {
  const config = getAuthConfig();

  try {
    const url = submit ? `requests?submit=true` : 'requests';
    const result = await instance.put(url, data, config).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

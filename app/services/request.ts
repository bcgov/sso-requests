import { instance } from './axios';
import { getAuthConfig } from './auth';
import { orderBy } from 'lodash';
import { Request } from 'interfaces/Request';
import { processRequest } from 'utils/helpers';

export const createRequest = async (data: Request): Promise<[Request, null] | [null, Error]> => {
  const config = getAuthConfig();

  try {
    const result = await instance.post('requests', data, config).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

export const getRequest = async (requestId: number): Promise<[Request, null] | [null, Error]> => {
  const config = getAuthConfig();
  try {
    const result: Request = await instance.post('request', { requestId }, config).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

export const getRequests = async (): Promise<[Request[], null] | [null, Error]> => {
  const config = getAuthConfig();
  try {
    let results: Request[] = await instance.get('requests', config).then((res) => res.data);
    results = orderBy(results, ['createdAt'], ['desc']);
    return [results.map(processRequest), null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

export const updateRequest = async (data: Request, submit = false): Promise<[Request, null] | [null, Error]> => {
  const config = getAuthConfig();

  try {
    let url = 'requests';

    if (submit) {
      url = `${url}?submit=true`;
      data.environments = ['dev', 'test', 'prod'];
    }

    const result = await instance.put(url, data, config).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

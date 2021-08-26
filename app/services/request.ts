import { instance } from './axios';
import { AxiosError } from 'axios';
import { getAuthConfig } from './auth';
import { orderBy } from 'lodash';
import { Request } from 'interfaces/Request';
import { processRequest } from 'utils/helpers';

const handleAxiosError = (err: AxiosError): [null, AxiosError] => {
  console.error(err);
  return [null, err as AxiosError];
};

export const createRequest = async (data: Request): Promise<[Request, null] | [null, AxiosError]> => {
  const config = getAuthConfig();

  try {
    const result = await instance.post('requests', data, config).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

export const getRequest = async (requestId: number): Promise<[Request, null] | [null, AxiosError]> => {
  const config = getAuthConfig();
  try {
    const result: Request = await instance.post('request', { requestId }, config).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

export const getRequests = async (include: string = 'active'): Promise<[Request[], null] | [null, Error]> => {
  const config = { ...getAuthConfig(), params: { include } };
  try {
    let results: Request[] = await instance.get('requests', config).then((res) => res.data);
    results = orderBy(results, ['createdAt'], ['desc']);
    return [results.map(processRequest), null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

interface RequestAllData {
  searchField: string[];
  searchKey: string;
  order: any;
  limit: number;
  page: number;
  status: string;
  archiveStatus: string;
}

interface RequestAllResult {
  count: number;
  rows: Request[];
}

export const getRequestAll = async (data: RequestAllData): Promise<[RequestAllResult, null] | [null, Error]> => {
  const config = { ...getAuthConfig() };

  try {
    const result: RequestAllResult = await instance.post('requests-all', data, config).then((res) => res.data);
    return [{ count: result.count, rows: result.rows.map(processRequest) }, null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

export const updateRequest = async (data: Request, submit = false): Promise<[Request, null] | [null, AxiosError]> => {
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
    return handleAxiosError(err);
  }
};

export const deleteRequest = async (id?: number): Promise<[Request[], null] | [null, Error]> => {
  const config = getAuthConfig();
  try {
    const result: Request[] = await instance.delete('requests', { ...config, params: { id } }).then((res) => res.data);
    return [result, null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

import { instance } from './axios';
import { AxiosError } from 'axios';
import { orderBy } from 'lodash';
import { Request } from 'interfaces/Request';
import { processRequest } from 'utils/helpers';
import Router from 'next/router';

const applicationBlockingErrors = ['E01'];

const handleAxiosError = (err: AxiosError): [null, AxiosError] => {
  const errorMessage = err?.response?.data || 'Unhandled Exception';
  if (applicationBlockingErrors.includes(errorMessage))
    Router.push({
      pathname: '/application-error',
      query: {
        error: errorMessage,
      },
    });
  return [null, errorMessage as AxiosError];
};

export const createRequest = async (data: Request): Promise<[Request, null] | [null, AxiosError]> => {
  try {
    const result = await instance.post('requests', data).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

export const getRequest = async (requestId: number): Promise<[Request, null] | [null, AxiosError]> => {
  try {
    const result: Request = await instance.post('request', { requestId }).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

export const getRequests = async (include: string = 'active'): Promise<[Request[], null] | [null, Error]> => {
  const config = { params: { include } };
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
  realms: string[] | null;
  environments: string[] | null;
}

interface RequestAllResult {
  count: number;
  rows: Request[];
}

export const getRequestAll = async (data: RequestAllData): Promise<[RequestAllResult, null] | [null, Error]> => {
  try {
    const result: RequestAllResult = await instance.post('requests-all', data).then((res) => res.data);
    return [{ count: result.count, rows: result.rows.map(processRequest) }, null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

export const updateRequest = async (data: Request, submit = false): Promise<[Request, null] | [null, AxiosError]> => {
  try {
    let url = 'requests';

    if (submit) {
      url = `${url}?submit=true`;
    }

    const result = await instance.put(url, data).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

export const deleteRequest = async (id?: number): Promise<[Request[], null] | [null, Error]> => {
  try {
    const result: Request[] = await instance.delete('requests', { params: { id } }).then((res) => res.data);
    return [result, null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

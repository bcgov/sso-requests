import { instance } from './axios';
import orderBy from 'lodash.orderby';
import isString from 'lodash.isstring';
import omit from 'lodash.omit';
import { Integration } from 'interfaces/Request';
import { processRequest } from 'utils/helpers';
import { handleAxiosError } from 'services/axios';
import { AxiosError } from 'axios';

export const createRequest = async (data: Integration): Promise<[Integration, null] | [null, AxiosError]> => {
  try {
    const result = await instance.post('requests', data).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const getRequest = async (requestId: number | string): Promise<[Integration, null] | [null, AxiosError]> => {
  try {
    const result: Integration = await instance
      .post('request', { requestId: isString(requestId) ? parseInt(requestId) : requestId })
      .then((res) => res.data);

    return [processRequest(result), null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const getRequests = async (include: string = 'active'): Promise<[Integration[], null] | [null, Error]> => {
  const config = { params: { include } };
  try {
    let results: Integration[] = await instance.get('requests', config).then((res) => res.data);
    results = orderBy(results, ['createdAt'], ['desc']);
    return [results.map(processRequest), null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const getTeamIntegrations = async (teamId: number): Promise<[Integration[], null] | [null, Error]> => {
  try {
    let results: Integration[] = await instance.get(`team-integrations/${teamId}`).then((res) => res.data);
    results = orderBy(results, ['createdAt'], ['desc']);
    return [results.map(processRequest), null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const resubmitRequest = async (requestId: number): Promise<[Integration, null] | [null, AxiosError]> => {
  try {
    const result: Integration = await instance.get(`requests/${requestId}/resubmit`).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const restoreRequest = async (requestId?: number): Promise<[Integration, null] | [null, AxiosError]> => {
  try {
    const result: Integration = await instance.get(`requests/${requestId}/restore`).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

interface RequestAllData {
  searchField: string[];
  searchKey: string;
  order: any;
  limit: number;
  page: number;
  status: string[];
  archiveStatus: string[];
  realms: string[] | null;
  environments: string[] | null;
  types: string[] | null;
  devIdps: string[] | null;
}

interface RequestAllResult {
  count: number;
  rows: Integration[];
}

export const getRequestAll = async (data: RequestAllData): Promise<[RequestAllResult, null] | [null, Error]> => {
  try {
    const result: RequestAllResult = await instance.post('requests-all', data).then((res) => res.data);
    return [{ count: result.count, rows: result.rows.map(processRequest) }, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const updateRequest = async (
  data: Integration,
  submit = false,
): Promise<[Integration, null] | [null, AxiosError]> => {
  try {
    let url = 'requests';

    if (submit) {
      url = `${url}?submit=true`;
    }

    data = omit(data, ['user', 'lastChanges']);

    // Changing optional string fields from undefined to empty string.
    // Prevents lodash merger treating them as missing data.
    data.devLoginTitle = data.devLoginTitle || '';
    data.testLoginTitle = data.testLoginTitle || '';
    data.prodLoginTitle = data.prodLoginTitle || '';
    data.additionalRoleAttribute = data.additionalRoleAttribute || '';
    data.clientId = data.clientId || '';
    data.primaryEndUsers = data.primaryEndUsers ?? [];
    data.primaryEndUsersOther = data.primaryEndUsersOther ?? '';

    const result = await instance.put(url, data).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const deleteRequest = async (id?: number): Promise<[Integration[], null] | [null, Error]> => {
  try {
    const result: Integration[] = await instance.delete('requests', { params: { id } }).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const updateRequestMetadata = async (data: Integration): Promise<[Integration, null] | [null, AxiosError]> => {
  try {
    const result = await instance.put('request-metadata', data).then((res) => res.data);
    return [processRequest(result), null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

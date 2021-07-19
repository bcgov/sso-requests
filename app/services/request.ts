import { instance } from './axios';
import { getAuthConfig } from './auth';
import { ServerRequest, ClientRequest } from 'interfaces/Request';
import requestsMockup from 'mock-data/requests';

const processRequest = (request: ServerRequest): ClientRequest => {
  const { agreeWithTerms, id, projectName, realm, validRedirectUrls, prNumber, environments, createdAt, status } =
    request;
  let devRedirectUrls: string[] = [],
    testRedirectUrls: string[] = [],
    prodRedirectUrls: string[] = [];
  if (validRedirectUrls) {
    devRedirectUrls = validRedirectUrls.dev || [];
    testRedirectUrls = validRedirectUrls.test || [];
    prodRedirectUrls = validRedirectUrls.prod || [];
  }
  const processedRequest = {
    agreeWithTerms,
    id,
    projectName,
    realm,
    devRedirectUrls,
    testRedirectUrls,
    prodRedirectUrls,
    prNumber,
    environments,
    createdAt,
    status,
  };
  console.log('processed server data for client is', processedRequest);
  return processedRequest;
};

const prepareRequest = (data: ClientRequest): ServerRequest => {
  const { devRedirectUrls = [], testRedirectUrls = [], prodRedirectUrls = [], ...rest } = data;

  const formattedEnvironments: string[] = [];
  if (devRedirectUrls.length > 0) formattedEnvironments.push('dev');
  if (testRedirectUrls.length > 0) formattedEnvironments.push('test');
  if (prodRedirectUrls.length > 0) formattedEnvironments.push('prod');

  const formattedValidRedirectUris = {
    dev: devRedirectUrls,
    test: testRedirectUrls,
    prod: prodRedirectUrls,
  };

  const newData: ServerRequest = {
    environments: formattedEnvironments,
    validRedirectUrls: formattedValidRedirectUris,
    ...rest,
  };
  console.log('processed frontend data for server is', newData);
  return newData;
};

export const createRequest = async (data: ClientRequest) => {
  const config = getAuthConfig();
  const preparedData = prepareRequest(data);
  try {
    const result = await instance.post('requests', { publicAccess: false, ...data }, config).then((res) => res.data);
    return processRequest(result);
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getRequest = async (requestId: number): Promise<ClientRequest | null> => {
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

export const updateRequest = async (data: ClientRequest, submit = false) => {
  console.log('raw data is', data);
  const preparedData = prepareRequest(data);
  console.log('processed data is', data);
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

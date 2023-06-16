import getConfig from 'next/config';
import axios, { AxiosRequestHeaders, AxiosResponse, AxiosError } from 'axios';
import { getAuthHeader } from 'services/auth';
import Router from 'next/router';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { api_url } = publicRuntimeConfig;

const instance = axios.create({
  baseURL: `${api_url}/`,
  timeout: 0,
  withCredentials: true,
});

instance.interceptors.request.use(
  async function (config) {
    const headers = config.headers as AxiosRequestHeaders & { skipAuth: boolean | undefined };
    if (headers.skipAuth) {
      delete headers.skipAuth;
      return config;
    }
    const authHeader = await getAuthHeader();
    return { ...config, headers: { ...headers, Authorization: authHeader } };
  },
  function (error) {
    return Promise.reject(error);
  },
);

instance.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error.response) {
      switch (error.response.status) {
        case 504:
          Router.push({
            pathname: '/application-error',
            query: { error: 'E04' },
          });
          break;
        case 408:
          Router.push({
            pathname: '/application-error',
            query: { error: 'E04' },
          });
          break;
        default:
          Router.push({
            pathname: '/application-error',
            query: {
              error: 'E05',
            },
          });
          break;
      }
    }

    return Promise.reject(error);
  },
);

export const handleAxiosError = (err: AxiosError): [null, AxiosError] => {
  let errorMessage = null;
  if (!err.response) errorMessage = 'Unhandled Exception';
  else {
    const errResponse: AxiosResponse = err.response;
    errorMessage = errResponse.data?.message || 'Unhandled Exception';
  }

  return [null, errorMessage as AxiosError];
};

export { instance };

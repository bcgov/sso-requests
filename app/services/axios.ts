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
      const status = error.response.status;
      if ([500].includes(status)) {
        Router.push({
          pathname: '/application-error',
          query: { error: 'E01' },
        });
      } else if ([502, 503].includes(status)) {
        Router.push({
          pathname: '/application-error',
          query: { error: 'E05' },
        });
      } else if ([504, 408].includes(status)) {
        Router.push({
          pathname: '/application-error',
          query: { error: 'E04' },
        });
      }
    }

    return Promise.reject(error);
  },
);

export const handleAxiosError = (err: AxiosError): [null, AxiosError] => {
  let errorMessage = null;
  console.log(err);

  if (!err.response) errorMessage = 'Unhandled Exception';
  else {
    const errResponse: AxiosResponse = err.response;
    errorMessage = errResponse.data?.message || 'Unhandled Exception';
  }

  return [null, errorMessage as AxiosError];
};

export { instance };

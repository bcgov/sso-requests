import getConfig from 'next/config';
import axios from 'axios';
import { getAuthHeader } from 'services/auth';
import { AxiosError } from 'axios';
import Router from 'next/router';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { api_url } = publicRuntimeConfig;

const instance = axios.create({
  baseURL: `${api_url}/`,
  timeout: 0,
  withCredentials: true,
});

instance?.interceptors.request.use(
  async function (config) {
    const { skipAuth } = config.headers;
    if (skipAuth) {
      delete config.headers.skipAuth;
      return config;
    }
    const authHeader = await getAuthHeader();
    return { ...config, headers: { ...config.headers, Authorization: authHeader } };
  },
  function (error) {
    return Promise.reject(error);
  },
);

const applicationBlockingErrors = ['E01'];

export const handleAxiosError = (err: AxiosError): [null, AxiosError] => {
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

export { instance };

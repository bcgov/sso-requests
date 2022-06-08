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

instance?.interceptors.request.use(
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

const applicationBlockingErrors = ['E01'];

export const handleAxiosError = (err: AxiosError): [null, AxiosError] => {
  if (!err.response) return [null, 'Unhandled Exception' as any];

  const errorMessage = (err.response as AxiosResponse).data?.message || 'Unhandled Exception';
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

import getConfig from 'next/config';
import axios from 'axios';
import { getAuthHeader } from 'services/auth';

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

export { instance };

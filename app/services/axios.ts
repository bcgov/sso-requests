// lib/apiClient.ts
import axios, { AxiosInstance, AxiosRequestHeaders, AxiosResponse, AxiosError } from 'axios';
import { getAuthHeader } from 'services/auth';
import Router from 'next/router';
import { fetchConfig } from '@app/utils/runtimeConfigStore';

// ─── Instance Setup ───────────────────────────────────────────────────────────

let resolvedInstance: AxiosInstance | null = null;

const instancePromise = fetchConfig().then(({ api_url }) => {
  resolvedInstance = axios.create({
    baseURL: `${api_url}/`,
    timeout: 0,
    withCredentials: true,
  });

  attachRequestInterceptor(resolvedInstance);
  attachResponseInterceptor(resolvedInstance);

  return resolvedInstance;
});

// ─── Proxy ────────────────────────────────────────────────────────────────────

export const instance = new Proxy({} as AxiosInstance, {
  get(_target, prop) {
    return async (...args: unknown[]) => {
      const client = resolvedInstance ?? (await instancePromise);
      return (client as any)[prop](...args);
    };
  },
});

export default instance;

// ─── Request Interceptor ──────────────────────────────────────────────────────

function attachRequestInterceptor(axiosInstance: AxiosInstance) {
  axiosInstance.interceptors.request.use(
    async (config) => {
      const headers = config.headers as AxiosRequestHeaders & {
        skipAuth?: boolean;
      };

      if (headers.skipAuth) {
        delete headers.skipAuth;
        return config;
      }

      const authHeader = await getAuthHeader();
      if (authHeader) {
        config.headers.set('Authorization', authHeader);
      }

      return config;
    },
    (error) => Promise.reject(error),
  );
}

// ─── Response Interceptor ─────────────────────────────────────────────────────

const ERROR_ROUTES: Record<string, string> = {
  '500': 'E01',
  '502,503': 'E05',
  '504,408': 'E04',
};

function attachResponseInterceptor(axiosInstance: AxiosInstance) {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;

      if (status) {
        const errorCode = Object.entries(ERROR_ROUTES).find(([statuses]) =>
          (statuses as unknown as number[]).includes(status),
        )?.[1];

        if (errorCode) {
          Router.push({ pathname: '/application-error', query: { error: errorCode } });
        }
      }

      return Promise.reject(error);
    },
  );
}

// ─── Error Handler ────────────────────────────────────────────────────────────

export const handleAxiosError = (err: AxiosError): [null, AxiosError] => {
  let errorMessage = null;
  if (!err.response) errorMessage = 'Unhandled Exception';
  else {
    const errResponse: AxiosResponse = err.response;
    errorMessage = errResponse.data?.message || 'Unhandled Exception';
  }

  return [null, errorMessage as AxiosError];
};

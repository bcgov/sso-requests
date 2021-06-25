import getConfig from 'next/config';
import axios from 'axios';

const { publicRuntimeConfig } = getConfig();
const { apiUrl } = publicRuntimeConfig;

export const instance = axios.create({
  baseURL: `${apiUrl}/`,
  timeout: 0,
  withCredentials: true,
});

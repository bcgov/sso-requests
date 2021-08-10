import getConfig from 'next/config';
import axios from 'axios';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { api_url } = publicRuntimeConfig;

export const instance = axios.create({
  baseURL: `${api_url}/`,
  timeout: 0,
  withCredentials: true,
});

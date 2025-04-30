import axios from 'axios';
import getConfig from 'next/config';

const { serverRuntimeConfig } = getConfig();
const { bcsc_registration_base_url_dev, bcsc_registration_base_url_test, bcsc_registration_base_url_prod } =
  serverRuntimeConfig;

export const getPrivacyZones = async (env: string = 'prod') => {
  let bcscBaseUrl;
  if (env === 'dev') bcscBaseUrl = bcsc_registration_base_url_dev;
  if (env === 'test') bcscBaseUrl = bcsc_registration_base_url_test;
  if (env === 'prod') bcscBaseUrl = bcsc_registration_base_url_prod;
  return await axios.get(`${bcscBaseUrl}/oauth2/privacy-zones`).then((res) => res.data);
};
export const getAttributes = async () => {
  return await axios
    .get(`${bcsc_registration_base_url_prod}/oauth2/claim-types`)
    .then((res) => res.data?.claims_supported);
};

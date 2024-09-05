import axios from 'axios';

export const getPrivacyZones = async (env: 'dev' | 'test' | 'prod' = 'prod') => {
  let bcscBaseUrl;
  if (env === 'dev') bcscBaseUrl = process.env.BCSC_REGISTRATION_BASE_URL_DEV;
  if (env === 'test') bcscBaseUrl = process.env.BCSC_REGISTRATION_BASE_URL_TEST;
  if (env === 'prod') bcscBaseUrl = process.env.BCSC_REGISTRATION_BASE_URL_PROD;
  return await axios.get(`${bcscBaseUrl}/oauth2/privacy-zones`).then((res) => res.data);
};
export const getAttributes = async () => {
  return await axios
    .get(`${process.env.BCSC_REGISTRATION_BASE_URL_PROD}/oauth2/claim-types`)
    .then((res) => res.data?.claims_supported);
};

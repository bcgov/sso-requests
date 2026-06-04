import axios from 'axios';
import createHttpError from 'http-errors';

export const getPrivacyZones = async (env: string = 'prod') => {
  let bcscBaseUrl;
  if (env === 'dev') bcscBaseUrl = process.env.BCSC_REGISTRATION_BASE_URL_DEV;
  if (env === 'test') bcscBaseUrl = process.env.BCSC_REGISTRATION_BASE_URL_TEST;
  if (env === 'prod') bcscBaseUrl = process.env.BCSC_REGISTRATION_BASE_URL_PROD;
  try {
    const pzResponse = await axios.get(`${bcscBaseUrl}/oauth2/privacy-zones`);
    return pzResponse.data;
  } catch (err) {
    console.error(`Error fetching privacy zones: ${err}`);
    throw new createHttpError[424]();
  }
};

export const getAttributes = async () => {
  try {
    const attributesResponse = await axios.get(`${process.env.BCSC_REGISTRATION_BASE_URL_PROD}/oauth2/claim-types`);
    return attributesResponse.data?.claims_supported;
  } catch (err) {
    console.error(`Error fetching bcsc attributes: ${err}`);
    throw new createHttpError[424]();
  }
};

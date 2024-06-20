import axios from 'axios';

export const getPrivacyZones = async () => {
  return await axios.get(`${process.env.BCSC_REGISTRATION_BASE_URL_PROD}/oauth2/privacy-zones`).then((res) => res.data);
};
export const getAttributes = async () => {
  return await axios
    .get(`${process.env.BCSC_REGISTRATION_BASE_URL_PROD}/oauth2/claim-types`)
    .then((res) => res.data?.claims_supported);
};

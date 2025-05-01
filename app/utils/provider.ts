import axios from 'axios';
import getConfig from 'next/config';

const { serverRuntimeConfig = {} } = getConfig() || {};
const { sso_url } = serverRuntimeConfig;

export const meta: any = {};

export const fetchIssuerConfiguration = async () => {
  const commonOpenIdURL = `${sso_url}/protocol/openid-connect`;
  const jwks_uri = `${commonOpenIdURL}/certs`;
  const keys = await axios.get(jwks_uri).then((res) => res.data?.keys || [], console.error);

  Object.assign(meta, {
    authorization_endpoint: `${commonOpenIdURL}/auth`,
    token_endpoint: `${commonOpenIdURL}/token`,
    jwks_uri,
    userinfo_endpoint: `${commonOpenIdURL}/userinfo`,
    end_session_endpoint: `${commonOpenIdURL}/logout`,
    keys,
  });
};

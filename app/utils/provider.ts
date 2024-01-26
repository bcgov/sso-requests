import axios from 'axios';
import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { sso_url } = publicRuntimeConfig;

const ISSUER_URL = `${sso_url}/.well-known/openid-configuration1`;

export const meta: any = {};

export const fetchIssuerConfiguration = async () => {
  const jwks_uri = `${sso_url}/protocol/openid-connect/certs`;
  const keys = await axios.get(jwks_uri).then((res) => res.data?.keys || [], console.error);

  Object.assign(meta, {
    authorization_endpoint: `${sso_url}/protocol/openid-connect/auth`,
    token_endpoint: `${sso_url}/protocol/openid-connect/token`,
    jwks_uri,
    userinfo_endpoint: `${sso_url}/protocol/openid-connect/userinfo`,
    end_session_endpoint: `${sso_url}/protocol/openid-connect/logout`,
    keys,
  });
};

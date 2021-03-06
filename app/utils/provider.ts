import axios from 'axios';
import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { sso_url } = publicRuntimeConfig;

const ISSUER_URL = `${sso_url}/.well-known/openid-configuration`;

export const meta: any = {};

export const fetchIssuerConfiguration = async () => {
  const { authorization_endpoint, token_endpoint, jwks_uri, userinfo_endpoint, end_session_endpoint } = await axios
    .get(ISSUER_URL)
    .then(
      (res: { data: any }) => res.data,
      () => null,
    );
  const keys = await axios.get(jwks_uri).then((res) => res.data?.keys, console.error);

  Object.assign(meta, {
    authorization_endpoint,
    token_endpoint,
    jwks_uri,
    userinfo_endpoint,
    end_session_endpoint,
    keys,
  });
};

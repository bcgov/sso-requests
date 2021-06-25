import axios from 'axios';
import rs from 'jsrsasign';
import getConfig from 'next/config';

const { publicRuntimeConfig } = getConfig();
const { sso_client_id } = publicRuntimeConfig;

import { meta } from './provider';

import { parseJWTPayload, parseJWTHeader } from './helpers';

export const verifyToken = async (token: string) => {
  const url = `${meta.jwks_uri}`;

  const data = await axios.get(url).then((res) => res.data, console.error);
  const keys = data?.keys;

  const tokenHeader = parseJWTHeader(token);

  // search for the kid key id in the JWK Keys
  const key = keys.find((key: { kid: string }) => key.kid === tokenHeader.kid);
  if (key === undefined) {
    console.error('public key not found in JWK jwks.json');
    return false;
  }

  // verify JWT Signature
  const keyObj: any = rs.KEYUTIL.getKey(key);
  const isValid = rs.KJUR.jws.JWS.verifyJWT(token, keyObj, { alg: ['RS256'] });
  if (!isValid) {
    console.error('signature verification failed');
    return false;
  }

  // verify token has not expired
  const tokenPayload = parseJWTPayload(token);
  if (Date.now() >= tokenPayload.exp * 1000) {
    console.error('token expired');
    return false;
  }

  // verify app_client_id
  const n = tokenPayload.aud.localeCompare(sso_client_id);
  if (n !== 0) {
    console.error('token was not issued for this audience');
    return false;
  }

  return tokenPayload;
};

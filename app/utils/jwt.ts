import rs from 'jsrsasign';
import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { sso_client_id } = publicRuntimeConfig;

import { meta } from './provider';
// import { verifyTokenWithAPI } from 'services/auth';
import { parseJWTPayload, parseJWTHeader } from './helpers';

export const verifyToken = async (token: string) => {
  if (!token) return false;

  const keys = meta.keys;
  const tokenHeader = parseJWTHeader(token);
  console.log('JWT key id: ', tokenHeader.kid);

  // search for the kid key id in the JWK Keys
  const key = keys?.find((currentKey: { kid: string }) => currentKey.kid === tokenHeader.kid);
  if (key === undefined) {
    console.error('public key not found in JWK jwks.json');
    return false;
  }

  console.log('JWK key: ', key);

  // verify token has not expired
  const tokenPayload = parseJWTPayload(token);
  if (Date.now() >= tokenPayload.exp * 1000) {
    console.log('token has expired');
    return false;
  }

  // TODO: see if validation results from API also invalid when having token issue again.
  // const isValidForAPI = await verifyTokenWithAPI(token);
  // console.log('isValidForAPI', isValidForAPI);

  // verify JWT Signature
  const keyObj: any = rs.KEYUTIL.getKey(key);
  const isValid = rs.KJUR.jws.JWS.verifyJWT(token, keyObj, { alg: ['RS256'] });
  if (!isValid) {
    console.error('signature verification failed');
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

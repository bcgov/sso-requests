//
// Helper functions
//

import { isEqual } from 'lodash';
import { Request } from 'interfaces/Request';

// Convert Payload from Base64-URL to JSON
export const decodePayload = (payload: string) => {
  if (!payload) return null;

  const cleanedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decodedPayload = atob(cleanedPayload);
  const uriEncodedPayload = Array.from(decodedPayload).reduce((acc, char) => {
    const uriEncodedChar = ('00' + char.charCodeAt(0).toString(16)).slice(-2);
    return `${acc}%${uriEncodedChar}`;
  }, '');
  const jsonPayload = decodeURIComponent(uriEncodedPayload);

  return JSON.parse(jsonPayload);
};

// Parse JWT Payload
export const parseJWTPayload = (token: string) => {
  if (!token) return null;

  const [header, payload, signature] = token.split('.');
  const jsonPayload = decodePayload(payload);

  return jsonPayload;
};

// Parse JWT Header
export const parseJWTHeader = (token: string) => {
  if (!token) return null;

  const [header, payload, signature] = token.split('.');
  const jsonHeader = decodePayload(header);

  return jsonHeader;
};

// Generate a Random String
export const getRandomString = () => {
  const randomItems = new Uint32Array(28);
  crypto.getRandomValues(randomItems);
  const binaryStringItems: string[] = [];
  randomItems.forEach((dec) => binaryStringItems.push(`0${dec.toString(16).substr(-2)}`));
  const result = binaryStringItems.reduce((acc: string, item: string) => `${acc}${item}`, '');
  return result;
};

// Encrypt a String with SHA256
export const encryptStringWithSHA256 = async (str: string) => {
  const PROTOCOL = 'SHA-256';
  const textEncoder = new TextEncoder();
  const encodedData = textEncoder.encode(str);
  return crypto.subtle.digest(PROTOCOL, encodedData);
};

// Convert Hash to Base64-URL
export const hashToBase64url = (arrayBuffer: Iterable<number>) => {
  const items = new Uint8Array(arrayBuffer);
  const stringifiedArrayHash = items.reduce((acc, i) => `${acc}${String.fromCharCode(i)}`, '');
  const decodedHash = btoa(stringifiedArrayHash);

  const base64URL = decodedHash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64URL;
};

export const idpToRealm = (idp: string[]) => {
  let sorted = [...idp].sort();
  if (isEqual(['github', 'idir'], sorted)) return 'onestopauth';
  if (isEqual(['bceid-basic', 'github', 'idir'], sorted)) return 'onestopauth-basic';
  if (isEqual(['bceid-basic', 'bceid-business', 'github', 'idir'], sorted)) return 'onestopauth-both';
  if (isEqual(['bceid-business', 'github', 'idir'], sorted)) return 'onestopauth-business';
  return null;
};

export const realmToIDP = (realm: string) => {
  let idps: string[] = [];
  if (realm === 'onestopauth') idps = ['github', 'idir'];
  if (realm === 'onestopauth-basic') idps = ['github', 'idir', 'bceid-basic'];
  if (realm === 'onestopauth-business') idps = ['github', 'idir', 'bceid-business'];
  if (realm === 'onestopauth-both') idps = ['github', 'idir', 'bceid-business', 'bceid-basic'];
  return JSON.stringify(idps);
};

export const getRequestUrls = (
  requestId: number | undefined,
  requests: Request[] | undefined,
  env: string | undefined
) => {
  const request = requests && requests.find((request) => request.id === requestId);
  if (request && request.validRedirectUrls) {
    // @ts-ignore
    return request.validRedirectUrls[env];
  } else {
    return [];
  }
};

export const getPropertyName = (env: string | undefined) => {
  if (env === 'dev') return 'devRedirectUrls';
  if (env === 'test') return 'testRedirectUrls';
  if (env === 'prod') return 'prodRedirectUrls';
  return '';
};

//
// Helper functions
//

import { isEqual } from 'lodash';
import { ClientRequest, ServerRequest } from 'interfaces/Request';
// @ts-ignore
import validate from 'react-jsonschema-form/lib/validate';
import requesterSchema from 'schemas/requester-info';
import providerSchema from 'schemas/providers';
import termsAndConditionsSchema from 'schemas/terms-and-conditions';

export const validateForm = (formData: ClientRequest) => {
  const { errors: firstPageErrors } = validate(formData, requesterSchema);
  const { errors: secondPageErrors } = validate(formData, providerSchema);
  const { errors: thirdPageErrors } = validate(formData, termsAndConditionsSchema);
  const allValid = firstPageErrors.length === 0 && secondPageErrors.length === 0 && thirdPageErrors.length === 0;
  if (allValid) return true;
  return {
    firstPageErrors,
    secondPageErrors,
    thirdPageErrors,
  };
};

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

export const realmToIDP = (realm?: string) => {
  let idps: string[] = [];
  if (realm === 'onestopauth') idps = ['github', 'idir'];
  if (realm === 'onestopauth-basic') idps = ['github', 'idir', 'bceid-basic'];
  if (realm === 'onestopauth-business') idps = ['github', 'idir', 'bceid-business'];
  if (realm === 'onestopauth-both') idps = ['github', 'idir', 'bceid-business', 'bceid-basic'];
  return idps;
};

export const getRedirectUrlPropertyNameByEnv = (env: string | undefined) => {
  if (env === 'dev') return 'devRedirectUrls';
  if (env === 'test') return 'testRedirectUrls';
  if (env === 'prod') return 'prodRedirectUrls';
  return 'devRedirectUrls';
};

const changeNullToUndefined = (data: any) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value === null) data[key] = undefined;
  });
  return data;
};

export const processRequest = (request: ServerRequest): ClientRequest => {
  const { validRedirectUris, ...rest } = request;
  const processedRequest: ClientRequest = {
    ...rest,
  };

  const { dev, test, prod } = validRedirectUris || {};
  if (dev) processedRequest.devRedirectUrls = dev;
  if (test) processedRequest.testRedirectUrls = test;
  if (prod) processedRequest.prodRedirectUrls = prod;
  // RJSF default values only applied to undefined values, not nulls from DB
  return changeNullToUndefined(processedRequest);
};

export const prepareRequest = (data: ClientRequest, previousData?: ClientRequest): ServerRequest => {
  const mergedData = { ...previousData, ...data };
  const { devRedirectUrls = [], testRedirectUrls = [], prodRedirectUrls = [], ...rest } = mergedData;

  const environments = [];

  if (devRedirectUrls.length > 0) {
    environments.push('dev');
  }
  if (testRedirectUrls.length > 0) {
    environments.push('test');
  }
  if (prodRedirectUrls.length > 0) {
    environments.push('prod');
  }

  const newData: ServerRequest = {
    ...rest,
    environments,
    validRedirectUris: {
      dev: devRedirectUrls,
      test: testRedirectUrls,
      prod: prodRedirectUrls,
    },
  };

  return newData;
};

export const transformErrors = (errors: any) => {
  return errors.map((error: any) => {
    if (error.property === '.agreeWithTerms') error.message = 'You must agree to the terms to submit a request.';
    else if (error.property === '.preferredEmail') error.message = 'Please enter a valid email address.';
    else if (error.property === '.realm') {
      error.message = 'Please select your IDPs.';
    } else if (error.property.includes('RedirectUrls')) {
      error.message = 'Please enter a valid url, including an http:// or https:// prefix.';
    } else if (error.property === '.projectName') {
      error.message = 'Please enter a project name.';
    }

    return error;
  });
};

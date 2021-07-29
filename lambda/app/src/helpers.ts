import { ServerRequest, ClientRequest } from './interfaces/Request';
import validate from 'react-jsonschema-form/lib/validate';
import requesterSchema from './schemas/requester-info';
import providerSchema from './schemas/providers';
import termsAndConditionsSchema from './schemas/terms-and-conditions';
import { FormattedData } from '../../shared/interfaces';
import { isObject } from 'lodash';

export const validateRequest = (formData: ClientRequest) => {
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

export const processRequest = (request: ServerRequest): ClientRequest => {
  const { validRedirectUris, ...rest } = request;
  const processedRequest: ClientRequest = {
    ...rest,
  };

  const { dev, test, prod } = validRedirectUris || {};
  if (dev) processedRequest.devRedirectUrls = dev;
  if (test) processedRequest.testRedirectUrls = test;
  if (prod) processedRequest.prodRedirectUrls = prod;

  return processedRequest;
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

// GH actions inputs expects an object where all values are strings
export const stringifyGithubInputs = (inputs: any) => {
  const stringifiedInputs = {};
  Object.entries(inputs).map(([key, value]) => {
    if (isObject(value) || Array.isArray(value)) {
      stringifiedInputs[key] = JSON.stringify(value);
    } else {
      stringifiedInputs[key] = String(value);
    }
  });

  return stringifiedInputs;
};

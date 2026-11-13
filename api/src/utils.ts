import { Response } from 'express';
import createHttpError, { HttpError } from 'http-errors';
import type { Transaction } from 'sequelize';
import { createAuditWriter } from '@sso/audit/server';
import models from '@/sequelize/models/models';
import sequelize from '@/sequelize/config';
import { logger } from '@/logger';

const log = logger.child({ module: 'utils' });

// The api's audit writer: @sso/audit over the api's `event` model, writing the
// same rows the app does. Every new event goes through this.
export const audit = createAuditWriter<Transaction>({
  model: models.event,
  transaction: (fn) => sequelize.transaction(fn),
  logger: log,
});
const httpLog = logger.child({ module: 'http' });

export const tryJSON = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

export const handleError = (res: Response, err: unknown) => {
  const httpErr = err instanceof HttpError ? err : null;
  // Only return intentionally thrown HttpError messages
  let message = httpErr?.message ?? 'unknown exception';
  const status = httpErr?.status ?? 422;
  // Anything that isn't an intentionally thrown HttpError is unexpected, whatever status the client is shown.
  if (!httpErr || status >= 500) httpLog.error({ err, status }, 'request failed');
  else httpLog.warn({ err, status }, 'request failed');
  res.status(status).json({ message });
};

export const parseErrors = (validationErrors) => {
  return validationErrors[0].message;
};

export const getKeycloakCredentials = (environment: string) => {
  let keycloakUrl: string;
  let keycloakUsername: string;
  let keycloakPassword: string;

  if (environment === 'dev') {
    keycloakUrl = process.env.KEYCLOAK_DEV_URL;
    keycloakUsername = process.env.KEYCLOAK_DEV_USERNAME;
    keycloakPassword = process.env.KEYCLOAK_DEV_PASSWORD;
  } else if (environment === 'test') {
    keycloakUrl = process.env.KEYCLOAK_TEST_URL;
    keycloakUsername = process.env.KEYCLOAK_TEST_USERNAME;
    keycloakPassword = process.env.KEYCLOAK_TEST_PASSWORD;
  } else if (environment === 'prod') {
    keycloakUrl = process.env.KEYCLOAK_PROD_URL;
    keycloakUsername = process.env.KEYCLOAK_PROD_USERNAME;
    keycloakPassword = process.env.KEYCLOAK_PROD_PASSWORD;
  } else {
    throw new createHttpError.BadRequest('invalid environment');
  }

  return {
    keycloakUrl,
    keycloakUsername,
    keycloakPassword,
  };
};

export const getBceidCredentials = (environment: string) => {
  const bceidServiceBasicAuth: string = process.env.BCEID_SERVICE_BASIC_AUTH;
  const bceidRequesterUserGuid: string = process.env.BCEID_REQUESTER_USER_GUID;
  let bceidServiceId: string;
  let bceidWebServiceUrl: string;

  if (environment === 'dev') {
    bceidServiceId = process.env.BCEID_SERVICE_ID_DEV;
    bceidWebServiceUrl = process.env.BCEID_WEB_SERVICE_URL_DEV;
  } else if (environment === 'test') {
    bceidServiceId = process.env.BCEID_SERVICE_ID_TEST;
    bceidWebServiceUrl = process.env.BCEID_WEB_SERVICE_URL_TEST;
  } else if (environment === 'prod') {
    bceidServiceId = process.env.BCEID_SERVICE_ID_PROD;
    bceidWebServiceUrl = process.env.BCEID_WEB_SERVICE_URL_PROD;
  } else {
    throw new createHttpError.BadRequest('invalid environment');
  }

  return {
    bceidServiceBasicAuth,
    bceidServiceId,
    bceidWebServiceUrl,
    bceidRequesterUserGuid,
  };
};

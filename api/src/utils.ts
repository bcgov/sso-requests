import { Response } from 'express';
import { isString } from 'lodash';
import createHttpError, { HttpError } from 'http-errors';
import models from '@/sequelize/models/models';

export const tryJSON = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

export const handleError = (res: Response, err: HttpError) => {
  let message = err.message || err;
  if (isString(message)) {
    message = tryJSON(message);
  }
  res.status(err.status || 422).json({ message });
};

export const createEvent = async (data: any) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.error(err);
  }
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

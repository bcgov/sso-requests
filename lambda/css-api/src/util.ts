import { models } from '@lambda-shared/sequelize/models/models';
import createHttpError from 'http-errors';
import validator from 'validator';

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
  let keycloakUrl;
  let keycloakUsername;
  let keycloakPassword;

  if (environment === 'dev') {
    keycloakUrl = process.env.KEYCLOAK_V2_DEV_URL;
    keycloakUsername = process.env.KEYCLOAK_V2_DEV_USERNAME;
    keycloakPassword = process.env.KEYCLOAK_V2_DEV_PASSWORD;
  } else if (environment === 'test') {
    keycloakUrl = process.env.KEYCLOAK_V2_TEST_URL;
    keycloakUsername = process.env.KEYCLOAK_V2_TEST_USERNAME;
    keycloakPassword = process.env.KEYCLOAK_V2_TEST_PASSWORD;
  } else if (environment === 'prod') {
    keycloakUrl = process.env.KEYCLOAK_V2_PROD_URL;
    keycloakUsername = process.env.KEYCLOAK_V2_PROD_USERNAME;
    keycloakPassword = process.env.KEYCLOAK_V2_PROD_PASSWORD;
  } else {
    throw new createHttpError.BadRequest('invalid environment');
  }

  return {
    keycloakUrl,
    keycloakUsername,
    keycloakPassword,
  };
};

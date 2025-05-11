import createHttpError from 'http-errors';
import validator from 'validator';
import { sql } from './db';
import { IntegrationEvent } from './models';

const tryJSON = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

export const createEvent = async (data: IntegrationEvent) => {
  const event = await sql`
    INSERT INTO events (request_id, event_code, idir_userid, details, idir_user_display_name)
    VALUES (${data.requestId}, ${data.eventCode}, ${data.idirUserid}, ${data.details}, ${data.idirUserDisplayName})
    RETURNING id, request_id, event_code, idir_userid, details, idir_user_display_name, created_at, updated_at
    `;
  return event;
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

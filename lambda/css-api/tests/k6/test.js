/*
 * CSS SSO API
 * CSS SSO API Service by BC Gov SSO Team
 *
 * OpenAPI spec version: 1.0.0
 *
 * NOTE: This class is auto generated by OpenAPI Generator.
 * https://github.com/OpenAPITools/openapi-generator
 *
 * OpenAPI generator version: 6.1.0-SNAPSHOT
 */

import http from 'k6/http';
import { group, check, sleep, fail } from 'k6';
import encoding from 'k6/encoding';

const BASE_URL = 'https://api-dev.loginproxy.gov.bc.ca/api/v1';
// Sleep duration between successive requests.
// You might want to edit the value of this variable or remove calls to the sleep function on the script.
const SLEEP_DURATION = 0.1;
// Global variables should be initialized.

const TOKEN_URL =
  'https://sso-keycloak-6-b861c7-test.apps.silver.devops.gov.bc.ca/auth/realms/standard/protocol/openid-connect/token';

let integrationId;

export function setup() {
  const encodedCredentials = encoding.b64encode(`${__ENV.client_id}:${__ENV.client_secret}`);

  const params = {
    headers: {
      Authorization: `Basic ${encodedCredentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  const tokenResponse = http.post(
    `${TOKEN_URL}`,
    {
      grant_type: 'client_credentials',
    },
    params,
  );
  console.debug(`Response from SSO: ${JSON.stringify(tokenResponse, 0, 2)}`);
  if (
    !check(tokenResponse, {
      'token response is 200': (r) => r.status === 200,
      'token response has a token': (r) => r.json('access_token'),
    })
  ) {
    fail('could not get an access token from SSO, did you supply a client secret?');
  }
  return { token: tokenResponse.json('access_token') };
}

export default function (data) {
  if (!data.token) {
    fail('ERROR: No token available from setup step.');
  }

  const options = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  group('fetch integrations', () => {
    {
      let url = BASE_URL + `/integrations`;
      let response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      response.json().data.forEach((int) => {
        if (
          !check(
            int,
            {
              'has id': (r) => int.id,
              'has projectName': (r) => int.projectName,
              'has authType': (r) => int.authType,
              'has environments': (r) => int.environments.length > 0,
              'has dev environment': (r) => int.environments.includes('dev'),
              'has status': (r) => int.status,
              'has createdAt': (r) => int.createdAt,
              'has updatedAt': (r) => int.updatedAt,
            },
            { integrationId: int.id },
          )
        ) {
          fail(`invalid integration fetched - ${int.id}`);
        }
      });

      integrationId = response.json().data[0].id;

      sleep(SLEEP_DURATION);
    }
  });

  group('fetch integration by id', () => {
    {
      let url = BASE_URL + `/integrations/${integrationId}`;

      let response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      if (
        !check(
          response,
          {
            'is status 200': (r) => r.status === 200,
            'fetched integration': (r) => r.json().success === true,
            'has id': (r) => r.json().data.id,
            'has projectName': (r) => r.json().data.projectName,
            'has authType': (r) => r.json().data.authType,
            'has environments': (r) => r.json().data.environments.length > 0,
            'has dev environment': (r) => r.json().data.environments.includes('dev'),
            'has status': (r) => r.json().data.status,
            'has createdAt': (r) => r.json().data.createdAt,
            'has updatedAt': (r) => r.json().data.updatedAt,
          },
          { integrationId },
        )
      ) {
        fail('invalid integration fetched');
      }

      sleep(SLEEP_DURATION);
    }
  });

  group('create role', () => {
    {
      let url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      let body = { name: 'role1' };
      let requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      let response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'is status 201': (r) => r.status === 201,
        'role created': (r) => r.json().success === true && r.json().message === 'created',
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('fetch roles', () => {
    {
      let url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      let response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'is status 200': (r) => r.status === 200,
        'fetched roles': (r) => r.json().success === true && r.json().data.length > 0,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('fetch role by name', () => {
    {
      let url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1`;
      let response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'is status 200': (r) => r.status === 200,
        'fetched role': (r) => r.json().success === true && r.json().data.name === 'role1',
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('create user role mapping', () => {
    {
      let url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      let requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      let body = { roleName: 'role1', username: __ENV.username, operation: 'add' };
      let response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'is status 201': (r) => r.status === 201,
        'user role mapping created': (r) => r.json().success === true && r.json().message === 'created',
      });
    }
  });

  group('fetch user role mappings', () => {
    {
      let url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?roleName=role1`;
      let response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'is status 200': (r) => r.status === 200,
        'fetched user role mapping by role name': (r) => r.json().success === true,
      });

      sleep(SLEEP_DURATION);
    }

    {
      let url =
        BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?username=${__ENV.username}`;
      let response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'is status 200': (r) => r.status === 200,
        'fetched user role mapping by username': (r) => r.json().success === true,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('delete role mapping', () => {
    {
      let url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      let body = { roleName: 'role1', username: __ENV.username, operation: 'del' };
      let requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      let response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'is status 200': (r) => r.status === 200,
        'user role mapping deleted': (r) => r.json().success === true && r.json().message === 'deleted',
      });
    }
  });

  group('delete role', () => {
    {
      let url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1`;
      let response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'is status 200': (r) => r.status === 200,
        'role deleted': (r) => r.json().success === true && r.json().message === 'deleted',
      });

      sleep(SLEEP_DURATION);
    }
  });
}

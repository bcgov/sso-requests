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

  group('GET list of integrations', () => {
    {
      const url = BASE_URL + `/integrations`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'return count of integrations greater than zero': (r) => r.json().data.length > 0,
      });

      response.json().data.forEach((int) => {
        if (
          !check(
            int,
            {
              'return valid integration': (r) =>
                int.id &&
                int.projectName &&
                int.authType &&
                int.environments.length > 0 &&
                int.environments.includes('dev') &&
                int.status &&
                int.createdAt &&
                int.updatedAt,
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

    {
      const url = BASE_URL + `/integrations?param=1&param=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when passed arbitrary query params': (r) => r.status === 400,
      });
    }
  });

  group('GET integration by id', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}`;

      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
      });

      if (
        !check(
          response,
          {
            'return valid integration': (r) =>
              r.json().id &&
              r.json().projectName &&
              r.json().authType &&
              r.json().environments.length > 0 &&
              r.json().environments.includes('dev') &&
              r.json().status &&
              r.json().createdAt &&
              r.json().updatedAt,
          },
          { integrationId },
        )
      ) {
        fail('invalid integration fetched');
      }

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}?param=1&param=2`;

      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params are passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/10000000`;

      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when integration not found': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('POST role', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles?param1=1&param2=2`;
      const body = { name: 'some-role' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const body = { name: '     ' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when role name with only spaces passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const body = {};
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid payload passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const body = { name: 'some-role' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 201 when success': (r) => r.status === 201,
        'return name': (r) => r.json().name === 'some-role',
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const body = { name: 'some-role' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 409 when re-creating existing role': (r) => r.status === 409,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('PUT role', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/some-role?param1=1&param2=2`;
      const body = { name: 'role1' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.put(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/nonexistentrole`;
      const body = { name: 'role1' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.put(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when role not found': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/some-role`;
      const body = {};
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.put(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid payload passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/some-role`;
      const body = { name: '     ' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.put(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when role name with only spaces passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/some-role`;
      const body = { name: 'role1' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.put(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'return name': (r) => r.json().name === 'role1',
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET list of roles', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'return count of roles': (r) => r.json().data.length > 0,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET role by name', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/nonexistentrole`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when non-existent role name passed': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'return name': (r) => r.json().name === 'role1',
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('POST user role mapping', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?param1=1&param2=2`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = { roleName: 'role1', username: __ENV.username, operation: 'add' };
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = {};
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid payload passed': (r) => r.status === 400,
      });
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = { roleName: 'nonexistentrole', username: __ENV.username, operation: 'add' };
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when non-existent role name passed': (r) => r.status === 404,
      });
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = { roleName: 'role1', username: 'nonexistentuser', operation: 'add' };
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when non-existent username passed': (r) => r.status === 404,
      });
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = { roleName: 'role1', username: __ENV.username, operation: 'add' };
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 201 when success': (r) => r.status === 201,
        'return role name': (r) => r.json().roles[0].name === 'role1',
        'return username': (r) => r.json().users[0].username === __ENV.username,
      });
    }
  });

  group('GET user role mappings', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when no query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?roleName=somerole`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when success on passing role name': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?roleName=role1`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success on passing role name': (r) => r.status === 200,
        'return role name': (r) => r.json().roles[0].name === 'role1',
        'return username': (r) => r.json().users[0].username === __ENV.username,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?username=nonexistentuser`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when success on passing username': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?username=${__ENV.username}`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success on passing username': (r) => r.status === 200,
        'return role name': (r) => r.json().roles[0].name === 'role1',
        'return username': (r) => r.json().users[0].username === __ENV.username,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        BASE_URL +
        `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?roleName=role1&username=${__ENV.username}`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success on passing role name and username': (r) => r.status === 200,
        'return role name': (r) => r.json().roles[0].name === 'role1',
        'return username': (r) => r.json().users[0].username === __ENV.username,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('DELETE role mapping', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?param1=1&param2=2`;
      const body = { roleName: 'role1', username: __ENV.username, operation: 'del' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const body = { roleName: 'role100000', username: __ENV.username, operation: 'del' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when non-existent role name passed': (r) => r.status === 404,
      });
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const body = { roleName: 'role1', username: 'nonexistentuser', operation: 'del' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when non-existent username passed': (r) => r.status === 404,
      });
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const body = {};
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid payload passed': (r) => r.status === 400,
      });
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const body = { roleName: 'role1', username: __ENV.username, operation: 'unknown' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid operation passed': (r) => r.status === 400,
      });
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const body = { roleName: 'role1', username: __ENV.username, operation: 'del' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 204 when success': (r) => r.status === 204,
      });
    }
  });

  group('DELETE role', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1?param1=1&param2=2`;
      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1`;
      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 204 when success': (r) => r.status === 204,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1`;
      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when role not found': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }
  });
}

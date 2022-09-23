import http from 'k6/http';
import { group, check, sleep, fail } from 'k6';
import encoding from 'k6/encoding';
import exec from 'k6/execution';

const BASE_URL = 'https://api-dev.loginproxy.gov.bc.ca/api/v1';
// Sleep duration between successive requests.
// You might want to edit the value of this variable or remove calls to the sleep function on the script.
const SLEEP_DURATION = 0.1;
// Global variables should be initialized.

const TOKEN_URL =
  'https://sso-keycloak-6-b861c7-test.apps.silver.devops.gov.bc.ca/auth/realms/standard/protocol/openid-connect/token';

let integrationId;

export const options = {
  stages: [
    { duration: '3m', target: 50 }, // simulate ramp-up of traffic from 1 to 50 users over 3 minutes.
    { duration: '5m', target: 50 }, // stay at 50 users for 6 minutes
    { duration: '3m', target: 0 }, // ramp-down to 0 users
  ],
};

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

  const params = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  group('GET list of integrations', () => {
    {
      const url = BASE_URL + `/integrations`;
      const response = http.get(url, params);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
      });

      integrationId = response.json().data[0].id;
      sleep(SLEEP_DURATION);
    }
  });

  group('GET integration by id', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}`;

      const response = http.get(url, params);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('POST role', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const body = { name: `role${exec.vu.idInTest}${exec.vu.iterationInInstance}` };
      const requestOptions = Object.assign({}, params);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 201 when success': (r) => r.status === 201,
        'return name': (r) => r.json().name === `role${exec.vu.idInTest}${exec.vu.iterationInInstance}`,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('PUT role', () => {
    {
      const url =
        BASE_URL +
        `/integrations/${integrationId}/${__ENV.environment}/roles/role${exec.vu.idInTest}${exec.vu.iterationInInstance}`;
      const body = { name: `role${exec.vu.idInTest}-${exec.vu.iterationInInstance}` };
      const requestOptions = Object.assign({}, params);
      requestOptions.headers.Accept = 'application/json';
      const response = http.put(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'return name': (r) => r.json().name === `role${exec.vu.idInTest}-${exec.vu.iterationInInstance}`,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET list of roles', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const response = http.get(url, params);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET role by name', () => {
    {
      const url =
        BASE_URL +
        `/integrations/${integrationId}/${__ENV.environment}/roles/role${exec.vu.idInTest}-${exec.vu.iterationInInstance}`;
      const response = http.get(url, params);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'return name': (r) => r.json().name === `role${exec.vu.idInTest}-${exec.vu.iterationInInstance}`,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('POST user role mapping', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const requestOptions = Object.assign({}, params);
      requestOptions.headers.Accept = 'application/json';
      const body = {
        roleName: `role${exec.vu.idInTest}-${exec.vu.iterationInInstance}`,
        username: __ENV.username,
        operation: 'add',
      };
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 201 when success': (r) => r.status === 201,
        'return role name': (r) =>
          r.json().roles.find((role) => role.name === `role${exec.vu.idInTest}-${exec.vu.iterationInInstance}`),
        'return username': (r) => r.json().users.find((user) => user.username === __ENV.username),
      });
    }
  });

  group('GET user role mappings', () => {
    {
      const url =
        BASE_URL +
        `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?roleName=role${exec.vu.idInTest}-${exec.vu.iterationInInstance}&username=${__ENV.username}`;
      const response = http.get(url, params);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success on passing role name and username': (r) => r.status === 200,
        'return role name': (r) =>
          r.json().roles.find((role) => role.name === `role${exec.vu.idInTest}-${exec.vu.iterationInInstance}`),
        'return username': (r) => r.json().users.find((user) => user.username === __ENV.username),
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('DELETE role mapping', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
      const body = {
        roleName: `role${exec.vu.idInTest}-${exec.vu.iterationInInstance}`,
        username: __ENV.username,
        operation: 'del',
      };
      const requestOptions = Object.assign({}, params);
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
      const url =
        BASE_URL +
        `/integrations/${integrationId}/${__ENV.environment}/roles/role${exec.vu.idInTest}-${exec.vu.iterationInInstance}`;
      const response = http.del(url, null, params);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 204 when success': (r) => r.status === 204,
      });

      sleep(SLEEP_DURATION);
    }
  });
}
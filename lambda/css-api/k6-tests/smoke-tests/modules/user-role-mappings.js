import { group, check, sleep, fail } from 'k6';
import http from 'k6/http';

const SLEEP_DURATION = 0.1;

export function testUserRoleMapping(options) {
  group('setup', () => {
    {
      // create a role
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const body = { name: 'role-mapping' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      http.post(url, JSON.stringify(body), requestOptions);
    }
  });
  group('POST user role mapping', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?param1=1&param2=2`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'add' };
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
      const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'invalid_operation' };
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid operation passed': (r) => r.status === 400,
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
      const body = { roleName: 'role-mapping', username: 'nonexistentuser', operation: 'add' };
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
      const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'add' };
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 201 when success': (r) => r.status === 201,
        'return role name': (r) => r.json().roles.find((role) => role.name === 'role-mapping'),
        'return username': (r) => r.json().users.find((user) => user.username === __ENV.username),
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
      const url =
        BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?roleName=role-mapping`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success on passing role name': (r) => r.status === 200,
        'return role name': (r) => r.json().roles.find((role) => role.name === 'role-mapping'),
        'return username': (r) => r.json().users.find((user) => user.username === __ENV.username),
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
        'return role name': (r) => r.json().roles.find((role) => role.name === 'role-mapping'),
        'return username': (r) => r.json().users.find((user) => user.username === __ENV.username),
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        BASE_URL +
        `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?roleName=role-mapping&username=${__ENV.username}`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success on passing role name and username': (r) => r.status === 200,
        'return role name': (r) => r.json().roles.find((role) => role.name === 'role-mapping'),
        'return username': (r) => r.json().users.find((user) => user.username === __ENV.username),
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('DELETE role mapping', () => {
    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?param1=1&param2=2`;
      const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'del' };
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
      const body = { roleName: 'role-mapping00000', username: __ENV.username, operation: 'del' };
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
      const body = { roleName: 'role-mapping', username: 'nonexistentuser', operation: 'del' };
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
      const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'unknown' };
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
      const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'del' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 204 when success': (r) => r.status === 204,
      });
    }
  });

  group('cleanup', () => {
    {
      // delete role
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role-mapping`;
      http.del(url, null, options);
    }
  });
}

import { group, check, sleep, fail } from 'k6';
import http from 'k6/http';

const SLEEP_DURATION = 0.1;

export function testRoles(options) {
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
        'should return 400 when empty payload passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const body = { invalidNameProp: 'some-role' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid payload props passed': (r) => r.status === 400,
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
        'return composite': (r) => r.json().composite === false,
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
        'should return 400 when empty payload passed': (r) => r.status === 400,
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
      const body = { invalidNameProp: 'role1' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.put(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid payload props passed': (r) => r.status === 400,
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
        'return composite': (r) => r.json().composite === false,
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
        'return composite': (r) => r.json().composite === false,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('POST composite role', () => {
    {
      // adding an additional role to associate it with role1
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const body = { name: 'composite-role' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      http.post(url, JSON.stringify(body), requestOptions);
    }
    {
      const url =
        BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles?param1=1&param2=2`;
      const body = [{ name: 'composite-role' }];
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
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles`;
      const body = [{ name: '     ' }];
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when composite role name with only spaces passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles`;
      const body = [];
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
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles`;
      const body = [{ invalidNameProp: 'composite-role' }];
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid payload props passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, null, requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when empty payload passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles`;
      const body = [{ name: 'composite-role' }];
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'return name': (r) => r.json().name === 'role1',
        'return composite': (r) => r.json().composite === true,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET list of composite roles', () => {
    {
      const url =
        BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'return count of roles': (r) => r.json().data.length > 0,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET composite role by name', () => {
    {
      const url =
        BASE_URL +
        `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles/composite-role?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles/nonexistentrole`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when non-existent role name passed': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles/composite-role`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'return name': (r) => r.json().name === 'composite-role',
        'return composite': (r) => r.json().composite === false,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('DELETE composite role by name', () => {
    {
      const url =
        BASE_URL +
        `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles/composite-role?param1=1&param2=2`;
      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles/nonexistentrole`;
      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when non-existent role name passed': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/role1/composite-roles/composite-role`;
      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 204 when success': (r) => r.status === 204,
      });

      sleep(SLEEP_DURATION);
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
  group('cleanup', () => {
    {
      // delete composite-role
      http.del(BASE_URL + `/integrations/${integrationId}/${__ENV.environment}/roles/composite-role`, null, options);
    }
  });
}

import { group, check, sleep, fail } from 'k6';
import http from 'k6/http';

const SLEEP_DURATION = 0.1;
let integrationId;

export function testUserRoleMapping(options) {
  group('GET integration Id', () => {
    {
      const url = __ENV.css_api_url + `/integrations`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'return count of integrations greater than zero': (r) => r.json().data.length > 0,
      });

      integrationId = response.json().data[0].id;

      sleep(SLEEP_DURATION);
    }
  });
  group('setup', () => {
    {
      // create a role
      const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/roles`;
      const body = { name: 'role-mapping' };
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      http.post(url, JSON.stringify(body), requestOptions);
    }
  });
  // commenting out deprecated endpoints
  // group('POST user role mapping', () => {
  //   {
  //     const url =
  //       __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?param1=1&param2=2`;
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'add' };
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 400 when arbitrary query params passed': (r) => r.status === 400,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const body = {};
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 400 when invalid payload passed': (r) => r.status === 400,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'invalid_operation' };
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 400 when invalid operation passed': (r) => r.status === 400,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const body = { roleName: 'nonexistentrole', username: __ENV.username, operation: 'add' };
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 404 when non-existent role name passed': (r) => r.status === 404,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const body = { roleName: 'role-mapping', username: 'nonexistentuser', operation: 'add' };
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 404 when non-existent username passed': (r) => r.status === 404,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'add' };
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 201 when success': (r) => r.status === 201,
  //       'return role name': (r) => r.json().roles.find((role) => role.name === 'role-mapping'),
  //       'return username': (r) => r.json().users.find((user) => user.username === __ENV.username),
  //     });

  //     sleep(SLEEP_DURATION);
  //   }
  // });

  // group('GET user role mappings', () => {
  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const response = http.get(url, options);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 400 when no query params passed': (r) => r.status === 400,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url =
  //       __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?param1=1&param2=2`;
  //     const response = http.get(url, options);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 400 when arbitrary query params passed': (r) => r.status === 400,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url =
  //       __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?roleName=somerole`;
  //     const response = http.get(url, options);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 404 when success on passing role name': (r) => r.status === 404,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url =
  //       __ENV.css_api_url +
  //       `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?roleName=role-mapping`;
  //     const response = http.get(url, options);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 200 when success on passing role name': (r) => r.status === 200,
  //       'return role name': (r) => r.json().roles.find((role) => role.name === 'role-mapping'),
  //       'return username': (r) => r.json().users.find((user) => user.username === __ENV.username),
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url =
  //       __ENV.css_api_url +
  //       `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?username=nonexistentuser`;
  //     const response = http.get(url, options);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 404 when success on passing username': (r) => r.status === 404,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url =
  //       __ENV.css_api_url +
  //       `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?username=${__ENV.username}`;
  //     const response = http.get(url, options);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 200 when success on passing username': (r) => r.status === 200,
  //       'return role name': (r) => r.json().roles.find((role) => role.name === 'role-mapping'),
  //       'return username': (r) => r.json().users.find((user) => user.username === __ENV.username),
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url =
  //       __ENV.css_api_url +
  //       `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?roleName=role-mapping&username=${__ENV.username}`;
  //     const response = http.get(url, options);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 200 when success on passing role name and username': (r) => r.status === 200,
  //       'return role name': (r) => r.json().roles.find((role) => role.name === 'role-mapping'),
  //       'return username': (r) => r.json().users.find((user) => user.username === __ENV.username),
  //     });

  //     sleep(SLEEP_DURATION);
  //   }
  // });

  // group('DELETE role mapping', () => {
  //   {
  //     const url =
  //       __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings?param1=1&param2=2`;
  //     const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'del' };
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 400 when arbitrary query params passed': (r) => r.status === 400,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const body = { roleName: 'role-mapping00000', username: __ENV.username, operation: 'del' };
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 404 when non-existent role name passed': (r) => r.status === 404,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const body = { roleName: 'role-mapping', username: 'nonexistentuser', operation: 'del' };
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 404 when non-existent username passed': (r) => r.status === 404,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const body = {};
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 400 when invalid payload passed': (r) => r.status === 400,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'unknown' };
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 400 when invalid operation passed': (r) => r.status === 400,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }

  //   {
  //     const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/user-role-mappings`;
  //     const body = { roleName: 'role-mapping', username: __ENV.username, operation: 'del' };
  //     const requestOptions = Object.assign({}, options);
  //     requestOptions.headers.Accept = 'application/json';
  //     const response = http.post(url, JSON.stringify(body), requestOptions);

  //     console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

  //     check(response, {
  //       'should return 204 when success': (r) => r.status === 204,
  //     });

  //     sleep(SLEEP_DURATION);
  //   }
  // });

  group('POST roles to user', () => {
    {
      const url =
        __ENV.css_api_url +
        `/integrations/${integrationId}/${__ENV.environment}/users/${__ENV.username}/roles?param1=1&param2=2`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = [{ name: 'role-mapping' }];
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/users/${__ENV.username}/roles`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = {};
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid payload passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url =
        __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/users/${__ENV.username}/roles`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = [{ name: 'nonexistentrole' }];
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when non-existent role name passed': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/users/nonexistentuser/roles`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = [{ name: 'role-mapping' }];
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when user with invalid or no idp passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url =
        __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/users/nonexistentuser@idir/roles`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = [{ name: 'role-mapping' }];
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when non-existent username passed': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/users/${__ENV.username}/roles`;
      const requestOptions = Object.assign({}, options);
      requestOptions.headers.Accept = 'application/json';
      const body = [{ name: 'role-mapping' }];
      const response = http.post(url, JSON.stringify(body), requestOptions);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 201 when success': (r) => r.status === 201,
        'return role name': (r) => r.json().data.find((role) => role.name === 'role-mapping'),
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET users associated to a role', () => {
    {
      const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/roles/nonexistentrole/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when role name does not exist': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url =
        __ENV.css_api_url +
        `/integrations/${integrationId}/${__ENV.environment}/roles/role-mapping/users?page=1&max=51`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when max count is above 50': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/roles/role-mapping/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'should return page': (r) => r.json().page === 1,
        'should return username': (r) => r.json().data.find((user) => user.username === __ENV.username),
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/roles/role-mapping/users?page=1&max=1`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'should return page': (r) => r.json().page === 1,
        'return username': (r) => r.json().data.find((user) => user.username === __ENV.username),
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET roles associated to an user', () => {
    {
      const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/users/nonexistentuser/roles`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when invalid or no idp passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url =
        __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/users/nonexistentuser@idir/roles`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when valid idp passed but user not found': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url =
        __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/users/${__ENV.username}/roles`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
        'should return role name': (r) => r.json().data.find((role) => role.name === 'role-mapping'),
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('DELETE unassign role from an user', () => {
    {
      const url =
        __ENV.css_api_url +
        `/integrations/${integrationId}/${__ENV.environment}/users/${__ENV.username}/roles/role-mapping?param1=1&param2=2`;
      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        __ENV.css_api_url +
        `/integrations/${integrationId}/${__ENV.environment}/users/${__ENV.username}/roles/role-mapping00000`;
      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when non-associated role name passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url =
        __ENV.css_api_url +
        `/integrations/${integrationId}/${__ENV.environment}/users/nonexistentuser/roles/role-mapping`;

      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when username with invalid or no idp passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url =
        __ENV.css_api_url +
        `/integrations/${integrationId}/${__ENV.environment}/users/nonexistentuser@idir/roles/role-mapping`;

      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when non-existent username with valid idp passed': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url =
        __ENV.css_api_url +
        `/integrations/${integrationId}/${__ENV.environment}/users/${__ENV.username}/roles/role-mapping`;

      const response = http.del(url, null, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 204 when success': (r) => r.status === 204,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('cleanup', () => {
    {
      // delete role
      const url = __ENV.css_api_url + `/integrations/${integrationId}/${__ENV.environment}/roles/role-mapping`;
      http.del(url, null, options);
    }
  });
}

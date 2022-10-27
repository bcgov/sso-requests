import { group, check, sleep, fail } from 'k6';
import http from 'k6/http';

const SLEEP_DURATION = 0.1;
let integrationId = 2;

export function testIntegrations(options) {
  group('GET list of integrations', () => {
    {
      const url = __ENV.css_api_url + `/integrations`;
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
      const url = __ENV.css_api_url + `/integrations?param=1&param=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when passed arbitrary query params': (r) => r.status === 400,
      });
    }
  });

  group('GET integration by id', () => {
    {
      const url = __ENV.css_api_url + `/integrations/${integrationId}`;

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
      const url = __ENV.css_api_url + `/integrations/${integrationId}?param=1&param=2`;

      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params are passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }

    {
      const url = __ENV.css_api_url + `/integrations/10000000`;

      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 404 when integration not found': (r) => r.status === 404,
      });

      sleep(SLEEP_DURATION);
    }
  });
}

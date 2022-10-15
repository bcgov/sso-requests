import { group, check, sleep, fail } from 'k6';
import http from 'k6/http';

const SLEEP_DURATION = 0.1;

export const testUsers = (options) => {
  group('GET users associated to IDIR', () => {
    {
      const url = BASE_URL + `/${__ENV.environment}/idir/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when no query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = BASE_URL + `/${__ENV.environment}/idir/users?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = BASE_URL + `/${__ENV.environment}/idir/users?firstName=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when query param firstName of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = BASE_URL + `/${__ENV.environment}/idir/users?lastName=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when query param lastName of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = BASE_URL + `/${__ENV.environment}/idir/users?email=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when query param email of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = BASE_URL + `/${__ENV.environment}/idir/users?guid=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when query param guid of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = BASE_URL + `/${__ENV.environment}/idir/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
  });
};

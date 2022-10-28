import { group, check, sleep, fail } from 'k6';
import http from 'k6/http';
import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';

const SLEEP_DURATION = 0.1;

export const testUsers = (options) => {
  group('GET users associated to IDIR', () => {
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/idir/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when no query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/idir/users?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/idir/users?firstName=a&lastName=a&email=a&guid=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when all query params of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/idir/users?firstName=test`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid firstName is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/idir/users?lastName=user`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid lastName is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/idir/users`);
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid email is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/idir/users?guid=312321dsadf3243dsf4543d`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid guid is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/idir/users`);
      url.searchParams.append('firstName', 'test');
      url.searchParams.append('lastName', 'user');
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      url.searchParams.append('guid', 'd2sf5tsdw3wsd54645gfgw3');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET users associated to Azure IDIR', () => {
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/azure-idir/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when no query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/azure-idir/users?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/azure-idir/users?firstName=a&lastName=a&email=a&guid=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when all query params of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/azure-idir/users?firstName=test`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid firstName is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/azure-idir/users?lastName=user`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid lastName is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/azure-idir/users`);
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid email is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/azure-idir/users?guid=312321dsadf3243dsf4543d`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid guid is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/azure-idir/users`);
      url.searchParams.append('firstName', 'test');
      url.searchParams.append('lastName', 'user');
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      url.searchParams.append('guid', 'd2sf5tsdw3wsd54645gfgw3');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET users associated to Github bcgov', () => {
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-bcgov/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when no query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-bcgov/users?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-bcgov/users?firstName=a&lastName=a&email=a&guid=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when all query params of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-bcgov/users?firstName=test`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid firstName is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-bcgov/users?lastName=user`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid lastName is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/github-bcgov/users`);
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid email is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-bcgov/users?guid=312321dsadf3243dsf4543d`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid guid is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/github-bcgov/users`);
      url.searchParams.append('firstName', 'test');
      url.searchParams.append('lastName', 'user');
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      url.searchParams.append('guid', 'd2sf5tsdw3wsd54645gfgw3');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET users associated to Github public', () => {
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-public/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when no query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-public/users?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-public/users?firstName=a&lastName=a&email=a&guid=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when all query params of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-public/users?firstName=test`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid firstName is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-public/users?lastName=user`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid lastName is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/github-public/users`);
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid email is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/github-public/users?guid=312321dsadf3243dsf4543d`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid guid is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/github-public/users`);
      url.searchParams.append('firstName', 'test');
      url.searchParams.append('lastName', 'user');
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      url.searchParams.append('guid', 'd2sf5tsdw3wsd54645gfgw3');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET users associated to Basic BCeID', () => {
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/basic-bceid/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when no query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/basic-bceid/users?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/basic-bceid/users?guid=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when query param guid of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/basic-bceid/users`);
      url.searchParams.append('firstName', 'test');
      url.searchParams.append('lastName', 'user');
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      url.searchParams.append('guid', 'd2sf5tsdw3wsd54645gfgw3dsf43r');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when other query params with valid guid is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/basic-bceid/users?guid=312321dsadf3243dsf4543d`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid guid is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET users associated to Business BCeID', () => {
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/business-bceid/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when no query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/business-bceid/users?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/business-bceid/users?guid=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when query param guid of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/business-bceid/users`);
      url.searchParams.append('firstName', 'test');
      url.searchParams.append('lastName', 'user');
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      url.searchParams.append('guid', 'd2sf5tsdw3wsd54645gfgw3dsf43r');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when other query params with valid guid is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/business-bceid/users?guid=312321dsadf3243dsf4543d`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid guid is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
  });

  group('GET users associated to Basic/Business BCeID', () => {
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/basic-business-bceid/users`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when no query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/basic-business-bceid/users?param1=1&param2=2`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when arbitrary query params passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/basic-business-bceid/users?guid=a`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when query param guid of length < 2 is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = new URL(`${__ENV.css_api_url}/${__ENV.environment}/basic-business-bceid/users`);
      url.searchParams.append('firstName', 'test');
      url.searchParams.append('lastName', 'user');
      url.searchParams.append('email', 'test.user@gov.bc.ca');
      url.searchParams.append('guid', 'd2sf5tsdw3wsd54645gfgw3dsf43r');
      const response = http.get(url.toString(), options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 400 when other query params with valid guid is passed': (r) => r.status === 400,
      });

      sleep(SLEEP_DURATION);
    }
    {
      const url = __ENV.css_api_url + `/${__ENV.environment}/basic-business-bceid/users?guid=312321dsadf3243dsf4543d`;
      const response = http.get(url, options);

      console.debug(`Response from CSS API: ${JSON.stringify(response, 0, 2)}`);

      check(response, {
        'should return 200 when a valid guid is passed and is success': (r) => r.status === 200,
      });

      sleep(SLEEP_DURATION);
    }
  });
};

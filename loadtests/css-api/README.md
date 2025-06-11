# K6 Automated API Test

## Setup the environment

```sh
# navigate to tests folder
cd ./sso-requests/loadtests/css-api

export K6_CLIENT_ID=
export K6_CLIENT_SECRET=
export K6_ENVIRONMENT=
export K6_USERNAME=
export K6_CSS_API_URL=
export K6_KEYCLOAK_TOKEN_URL=
```

## Run smoke tests

```sh
cd ./smoke-tests

# remove --http-debug="full" option to hide the logs
k6 run -e client_id=$K6_CLIENT_ID -e client_secret=$K6_CLIENT_SECRET -e environment=$K6_ENVIRONMENT -e username=$K6_USERNAME -e css_api_url=$K6_CSS_API_URL -e keycloak_token_url=$K6_KEYCLOAK_TOKEN_URL smoke-tests.js --http-debug="full"
```

## Run load tests

- Increase the access token lifespan if you are going to run the tests for longer time periods
- To increase the value, open keycloak navigate to `https://sso-keycloak-6-b861c7-test.apps.silver.devops.gov.bc.ca/auth` and select `standard` realm. Open `clients` and select your service account.
- Go to `Advanced Settings` and update `Access Token Lifespan`

```sh
# update options in the script to manage VUs and Iterations
# remove --http-debug="full" option to hide the logs
k6 run -e client_id=$K6_CLIENT_ID -e client_secret=$K6_CLIENT_SECRET -e environment=$K6_ENVIRONMENT -e username=$K6_USERNAME -e css_api_url=$K6_CSS_API_URL -e keycloak_token_url=$K6_KEYCLOAK_TOKEN_URL load-tests.js --http-debug="full"
```

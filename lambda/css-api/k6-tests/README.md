# K6 Automated API Test

## Setup the environment

```sh
# navigate to tests folder
cd ./sso-requests/lambda/css-api/k6-tests

export K6_CLIENT_ID=
export K6_CLIENT_SECRET=
export K6_ENVIRONMENT=
export K6_USERNAME=
```

## Run smoke tests

```sh
# remove --http-debug="full" option to hide the logs
k6 run -e client_id=$K6_CLIENT_ID -e client_secret=$K6_CLIENT_SECRET -e environment=$K6_ENVIRONMENT -e username=$K6_USERNAME smoke-tests.js --http-debug="full"
```

## Run load tests

```sh
# update options in the script to manage VUs and Iterations
# remove --http-debug="full" option to hide the logs
k6 run -e client_id=$K6_CLIENT_ID -e client_secret=$K6_CLIENT_SECRET -e environment=$K6_ENVIRONMENT -e username=$K6_USERNAME load-tests.js --http-debug="full"
```

# K6 Automated API Test

## Steps to run the tests

```sh
# navigate to tests folder
cd ./sso-requests/lambda/css-api/tests/k6

export K6_CLIENT_ID=
export K6_CLIENT_SECRET=
export K6_ENVIRONMENT=
export K6_USERNAME=

# remove --http-debug="full" option to hide the logs
# run the test script
k6 run -e client_id=$K6_CLIENT_ID -e client_secret=$K6_CLIENT_SECRET -e environment=$K6_ENVIRONMENT -e username=$K6_USERNAME test.js --http-debug="full"
```

#!/bin/bash

ACCESS_TOKEN=$(curl -X POST -d grant_type=client_credentials -d client_id=$K6_CLIENT_ID -d client_secret=$K6_CLIENT_SECRET https://sso-keycloak-6-b861c7-test.apps.silver.devops.gov.bc.ca/auth/realms/standard/protocol/openid-connect/token | jq '.access_token' -r)

LIST_OF_ROLES=$(curl -X GET https://api-dev.loginproxy.gov.bc.ca/api/v1/integrations/7890/dev/roles -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.[] | .[].name' -r)

for i in $(echo "$LIST_OF_ROLES" | tr ',' '\n')
do
    echo "https://api-dev.loginproxy.gov.bc.ca/api/v1/integrations/7890/dev/roles/$i"
    curl -X DELETE "https://api-dev.loginproxy.gov.bc.ca/api/v1/integrations/7890/dev/roles/$i" -H "Authorization: Bearer $ACCESS_TOKEN"
done

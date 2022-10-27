#!/bin/bash

ACCESS_TOKEN=$(curl -X POST -d grant_type=client_credentials -d client_id=$K6_CLIENT_ID -d client_secret=$K6_CLIENT_SECRET https://sso-keycloak-6-b861c7-test.apps.silver.devops.gov.bc.ca/auth/realms/standard/protocol/openid-connect/token | jq '.access_token' -r)

INTEGRATION_ID=$(curl -X GET $K6_CSS_API_URL/integrations -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data | .[].id' -r)

if [ -z "$INTEGRATION_ID" ];
then
    LIST_OF_ROLES=$(curl -X GET $K6_CSS_API_URL/integrations/$INTEGRATION_ID/$K6_ENVIRONMENT/roles -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.[] | .[].name' -r)

    for i in $(echo "$LIST_OF_ROLES" | tr ',' '\n')
    do
        echo "$K6_CSS_API_URL/integrations/$INTEGRATION_ID/$K6_ENVIRONMENT/roles/$i"
        curl -X DELETE "$K6_CSS_API_URL/integrations/$INTEGRATION_ID/$K6_ENVIRONMENT/roles/$i" -H "Authorization: Bearer $ACCESS_TOKEN"
    done
fi;

#!/bin/sh

while [ ! $(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL/auth/realms/master") -eq 200 ]; do
  sleep 5
  echo "keycloak $KC_ENV is not up yet using $HEALTH_CHECK_URL"
done

echo "keycloak is up"

terraform init && terraform plan && terraform apply --auto-approve

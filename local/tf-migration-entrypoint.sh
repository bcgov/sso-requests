#!/bin/sh

while [ ! $(curl -s -o /dev/null -w "%{http_code}" "$TF_VAR_keycloak_url/auth/realms/master") -eq 200 ]; do
  sleep 5
  echo "keycloak is not up yet"
done

echo "keycloak is up"

terraform init && terraform plan && terraform apply --auto-approve

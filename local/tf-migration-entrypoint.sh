#!/bin/sh

while [ ! $(curl -s -o /dev/null -w "%{http_code}" http://dev-keycloak:9080/auth/realms/master) -eq 200 ]; do
  sleep 5
  echo "keycloak is not up yet"
done

echo "keycloak is up"

terraform init && terraform plan && terraform apply --auto-approve

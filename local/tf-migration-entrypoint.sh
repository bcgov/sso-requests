#!/bin/sh

IP=$(ping -c 1 dev-keycloak | grep 'PING' | awk '{print $3}' | tr -d '()')
while [ ! $(curl -s -o /dev/null -w "%{http_code}" "${IP}9080/auth/realms/master") -eq 200 ]; do
  sleep 5
  IP=$(ping -c 1 dev-keycloak | grep 'PING' | awk '{print $3}' | tr -d '()')
  echo "keycloak is not up yet"
done

echo "keycloak is up"

terraform init && terraform plan && terraform apply --auto-approve

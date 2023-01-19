#!/bin/bash
set -e

REPO_ROOT=$(cd .. && pwd)

if [[ -n "$1" ]]; then
  API_SSO_CONFIGURATION=$(curl -XGET $1)
  ISSUER=$(echo $API_SSO_CONFIGURATION | jq -r '.issuer')
  JWKS_URI=$(echo $API_SSO_CONFIGURATION | jq -r '.jwks_uri')
  JWKS=$(curl -XGET $JWKS_URI)
  JSON=$(jq -c --null-input --arg issuer "$ISSUER" --argjson jwks "$JWKS"  '{"issuer": $issuer, "jwks": $jwks}')
else
  echo "please pass openid-configuration url as the first argument"
  exit 1
fi

cd $REPO_ROOT && make app_install && make server_install

cd $REPO_ROOT/lambda/css-api/src && echo $JSON > api-sso-configuration.json

cd $REPO_ROOT/lambda && make build_all && rm -rf $REPO_ROOT/loadtests/lambdas/*.zip && cp $REPO_ROOT/terraform/*.zip $REPO_ROOT/loadtests/lambdas/

rm -rf $REPO_ROOT/lambda/css-api/src/api-sso-configuration.json

CREATE ROLE keycloak
WITH
  LOGIN PASSWORD 'keycloak';

CREATE DATABASE keycloak OWNER keycloak;
CREATE DATABASE keycloak-test OWNER keycloak;
CREATE DATABASE keycloak-prod OWNER keycloak;

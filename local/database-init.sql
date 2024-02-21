CREATE ROLE keycloak
WITH
  LOGIN PASSWORD 'keycloak';

CREATE DATABASE keycloak OWNER keycloak;

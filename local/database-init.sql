CREATE ROLE keycloak
WITH
  LOGIN PASSWORD 'keycloak';

CREATE DATABASE keycloak OWNER keycloak;
CREATE DATABASE keycloaktest OWNER keycloak;
CREATE DATABASE keycloakprod OWNER keycloak;

# Migrate roles

This module is a small script to migrate roles from the keycloak instances into our applications database. It will only need to be run once to catch up the data, since the CSS app will begin tracking roles itself going forward.

## Getting Started

See the [example env file](./.env.example) for the required environment variables. You can use the existing `script-cli` client from the master realm to run this module, adding the appropriate secrets from the dev, test, and prod keycloaks. Set the appropriate base kc urls for either sandbox or prod, e.g for sandbox `KC_URL_DEV` would be `https://sso-keycloak-e4ca1d-dev.apps.gold.devops.gov.bc.ca`.

To run the module:

- `yarn`
- `yarn start`

## About

This script will generate a sql file that can then be run against the database to insert the required roles. It does not connect directly to the database instance, since our RDS database in amazon is inside of a VPC with no public access. The generated file can be run in the aws console.

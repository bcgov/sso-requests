# Migrate roles

This module is a small script to migrate roles from the keycloak instances into our applications database. It will only need to be run once to catch up the data, since the CSS app will begin tracking roles itself going forward.

## Getting Started

See the [example env file](./.env.example) for the required environment variables. You can use the existing `script-cli` client from the master realm to run this module, adding the appropriate secrets from the dev, test, and prod keycloaks. Set the appropriate base kc urls for either sandbox or prod, e.g for sandbox `KC_URL_DEV` would be `https://sso-keycloak-e4ca1d-dev.apps.gold.devops.gov.bc.ca`.

To run the module:

- `yarn`
- `yarn start`

## About

This script will generate a sql file that can then be run against the database to insert the required roles. It does not connect directly to the database instance, since our RDS database in amazon is inside of a VPC with no public access. The generated file can be run in the aws console.

## Analyse Difference

A small script to check for missing roles based on a CSV is under the analyse-role-difference.js file. To get the csv data, use the csv export from the "potentialy impacted roles" panel in the [CSS dashboard](https://uzw525hsr2.execute-api.ca-central-1.amazonaws.com/d/d9fae58a-8251-4d86-8bea-542f1f8963da/search-by-id-filter?orgId=1). Remove the top row of column names and save it in this repo as data.csv. See .env.example for required env vars. It will log out any roles that are not in keycloak, as an array of arrays containing `[clientid, rolename, environment]`.

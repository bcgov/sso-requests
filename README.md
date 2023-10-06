# sso-requests

![Lifecycle:Stable](https://img.shields.io/badge/Lifecycle-Stable-97ca00)

The request process workflow tool for the RedHat SSO Dev Exchange service

## About

This is a tool to streamline the single-sign-on request process for new keycloak clients.
It consists of:

- A react frontend hosted on github pages. See the [/app](./app) subdirectory for more.
- A serverless AWS backend, including lambda functions, API gateway, and an RDS database using postgres.
  All AWS resources are defined in terraform and can be found in the [/terraform](./terraform) subdirectory, while
  the code for the lambda functions are in the [/lambda](./lambda) subdirectory.
- Github actions scripts that handle the creation of clients through terraform, as well as communicate
  events to the backend.

## Tech Overview

**keycloak**: New keycloak clients are created and version controlled through [terraform](https://www.terraform.io/). For production, the terraform scripts
to create clients are in the github [sso-terraform](https://github.com/bcgov/sso-terraform) repository, and for development they are in [sso-terraform-dev](https://github.com/bcgov/sso-terraform-dev). To create new clients,
this application adds terraform files to those repositories (for the prod and dev versions respectively) and merges them to have [terraform cloud](https://www.terraform.io/cloud?utm_campaign=22Q1_NA_TERRAFORMCLOUDGOOGLEADS_TRIAL&utm_source=GOOGLE&utm_medium=SEA-PD&utm_offer=TRIAL&gclid=EAIaIQobChMI4cbnoear8gIVrSGtBh2QrAydEAAYASAAEgJfAvD_BwE)
add the new clients to keycloak.

**Github**: This application uses github actions to trigger client creation, as well as github pages to host the frontend application. The following three repositories are used in the workflow:

1. **sso-requests**: Source code of the application. Github pages hosts the production app.
2. **sso-terraform-dev**: Contains terraform scripts defining the dev keycloak clients. Contains actions this application triggers to add new clients through terraform cloud. Github pages is also used to host the dev frontend.
3. **sso-terraform**: Same logic as sso-terraform-dev, but for the production environment.

**AWS**: The backend application is provisioned through AWS. It uses API Gateway, AWS Lambda, and RDS.

**Terraform**: All infrastructure for this application is created and version controlled through terraform. The application is launched into an existing
AWS zone, and uses the predefined VPC and subnets.

## Workflow

The general workflow for new client creation is:

1. A user authenticates with their IDIR and fills in a form for their new client
2. Data is validated in the backend lambda function (see `lambda/app`) and a new github workflow is kicked off (in the sso-terraform repository). See the [repositories yaml file](https://github.com/bcgov/sso-terraform/blob/main/.github/workflows/request.yml) for details.
3. The request generates terraform files for the new client and creates a pull request to the default branch. The event (pr creation event) is logged to to the lambda backend. The pull request is labelled as `auto-generated`.
4. New auto-generated pull requests start the [terraform workflow](https://github.com/bcgov/sso-terraform/blob/main/.github/workflows/terraform.yml). This workflow
   will run `terraform plan`, and validate that the resources created follow reasonable constraints. If the plan is valid, it will auto-merge the pull request to the main branch. A terraform-plan event is logged to the backend.
5. Merge events to main also trigger the [terraform workflow](https://github.com/bcgov/sso-terraform-dev/blob/main/.github/workflows/terraform.yml).
   Terraform will attempt to apply the changes, creating a new client. An `apply` event will be logged to the backend.

The process for updating clients is similar (see the [github scripts](https://github.com/bcgov/sso-terraform-dev/blob/main/scripts) for more details).

See the below diagram for more information:

![diagram](https://user-images.githubusercontent.com/37274633/129223427-ec5b36fb-51a5-490c-856d-57439812d2fd.jpg)

## Tech Stack

**Front-end**: The front end application is built with nextjs (a react framework). It is a static application hosted on github pages.
A static single-page-application was chosen to deliver a fast user experience, take advantage of pre-built bcgov components, and
to interact as an independant layer from the backend.

**Back-end**: The backend uses AWS serverless technologies, which was chosen to reduce cost (with serverless, you only pay for what you use)
since this application is expected to have low traffic. It uses:

- **Lambda**: Lambda functions are used to handle backend logic on API events
- **API Gateway**: API Gateway supports serverless infrastructure, and is used to proxy API events to the lambda functions.
- **RDS**: An amazon relational database that supports serverless infrastructure.

## Logging

The following events are logged with timestamps as a request workflow runs:

- **Pull Requests**: When a new pull request workflow is triggered, a success or failure event is logged
- **Terraform Plan**: When a terraform plan completes, a success or failure event is logged.
- **Terraform Apply**: When a terraform apply completes, a success or failure event is logged.

These events are saved in an event table and can be used to monitor the cycle a request has gone through.
In addition, requests are timestamped for time created and time updated.

## Getting Started

For setup of your development environment, a detailed Developer Guide may be found [here](./docs/developer-guide.md).

In the [/app](./app) and [/lambda](./lambda) directories install dependencies with `npm i` or `yarn`.

**Backend**

To run this app, you will need to setup your terraform infrastructure. The code in the [terraform](./terraform) directory
assumes one available VPC exists with available subnets in two zones. To set the names for your subnets the terraform variables
`subnet_a` and `subnet_b` should be set.

The lambda functions are written in typescript, and to compile and bundle them you can run `make lambda-all` from the lambda directory.
Once they are compiled, from the [terraform](./terraform) directory you can run `terraform apply` to build the backend.

**Frontend**
See the [example env file](./app/,env.example) for an example environment variable setup. You will require:

- APP_ENV: Application environment
- APP_URL: The application url
- API_URL: The API endpoint of your API Gateway
- APP_BASE_PATH: The base path of the application URL
- SSO_URL: The URL of the keycloak realm
- SSO_CLIENT_ID: The ID of your keycloak client
- SSO_REDIRECT_URI: Your redirect url for after users have authenticated. For local development use `localhost:3000`
- SSO_AUTHORIZATION_RESPONSE_TYPE: Set to `code`
- SSO_AUTHORIZATION_SCOPE: Set to `openid`
- SSO_TOKEN_GRANT_TYPE: Set to `authorization_code`
- MAINTENANCE_MODE_ACTIVE: If enabled, displays maintenance page forever

The app can then be run locally by running `yarn dev`

## Required Github Secrets

This repository requires the following secrets:

- `KEYCLOAK_DEV_CLIENT_URL`: The URL of the keycloak dev environment.
- `KEYCLOAK_TEST_CLIENT_URL`: The URL of the keycloak test environment.
- `KEYCLOAK_PROD_CLIENT_URL`: The URL of the keycloak prod environment.
- `KEYCLOAK_DEV_CLIENT_ID`: The client id for the keycloak dev environment.
- `KEYCLOAK_TEST_CLIENT_ID`: The client id for the keycloak test environment.
- `KEYCLOAK_PROD_CLIENT_ID`: The client id for the keycloak prod environment.
- `KEYCLOAK_DEV_CLIENT_SECRET`: The client secret for the keycloaks dev environment.
- `KEYCLOAK_TEST_CLIENT_SECRET`: The client secret for the keycloaks test environment.
- `KEYCLOAK_PROD_CLIENT_SECRET`: The client secret for the keycloaks prod environment.
- `GH_ACCESS_TOKEN`: Access token for the github service account (used to trigger workflows in `sso-terraform`).
- `GH_SECRET`: The secret used to authorize requests between github actions (from `sso-terraform`) to the API.
- `TFC_TEAM_TOKEN`: The token used to run terraform cloud.

In Addition, the following secrets are required for `sso-terraform` and `sso-terraform-dev` to work with this app:

- `GH_ACCESS_TOKEN`: Access token for the github service account (used to run github API calls).
- `GH_SECRET`: The secret used to authorize requests between github actions (from `sso-terraform`) to the API.

## Tests

This repository has frontend tests using jest and react testing library, and backend tests run with jest.
Tests are run in CI in the `test.yml` file.

To run the frontend tests, from the `app` directory run `yarn test`. If adding a snapshot test,
running `yarn test` will add the new snapshot file for you. If you want to update a snapshot test,
run `yarn test -u`

To run the backend unit tests,

- you will need to have a local postgres database running.
  Ensure you have started the server with `pg_ctl start`

- For the first time running the tests, the database will need to be created.
  Run `make local_db` from the root directory
  _Note: you may need to run `chmod +x ./.bin/db-setup.sh` to give necessary permissions_.

- Run `make server_test` to run all the backend unit tests

- Navigate to `./lambda/jest_stare` directory and open the `index.html` to view the report that shows the code coverage

## Errors

Error codes we use for the application:

- `E01`: There is an application in the `sso-terraform` repository that cannot be applied, blocking new requests
- `E02`: The user has a token in their session storage that is invalid
- `E03`: Missing of invalid email address associated with your IDIR account
- `E04`: Request timeout
- `E05`: 503 Service Temporarily Unavailable

## Reporting

For now, reporting information can be gathered directly from the AWS Data API.
To use, you will need access to the AWS platform as well as the database credentials.

- In the AWS console, navigate to the `RDS` dashboard and select DB Clusters from the resources panel.
- Select `aurora-db-postgres`. From the top right `actions` dropdown select query.
- You will be prompted for the db host, db name, username and password. Enter these and select `connect` (it may take some time to connect)
- From the saved queries, select the one you would like to use (refer to descriptions for information)

**Queries**

_Some queries are id specific, update the where clause to change the request number_

```sql
-- Count of clients in draft
select count(*) from requests where status='draft';

-- Count of clients awaiting approval (note: currently auto-approve but will apply when bceid is added)
select count(*) from requests where status='submitted';

-- Count of clients completed
select count(*) from requests where status='applied';

-- Time request was initially submitted
select events.created_at from events join requests on requests.id = events.request_id where requests.id=1 and events.event_code = 'request-pr-success' order by events.created_at asc limit 1;

-- (initial )time request was fulfilled (dev, test, and prod)
select events.created_at from events join requests on requests.id = events.request_id where requests.id=1 and events.event_code = 'request-apply-success';

-- get all clients. note the null are those that have not submittted request (zs)
select client_name, preferred_email from requests where archived = false;
```

**Queries to fetch user emails**

```sql
-- Integration users with a team associated with
SELECT
    r.id,
    r.client_name,
    r.service_type,
    r.team_id,
    ut.user_id,
    u.idir_email,
    u.additional_email
FROM
    requests as r
INNER JOIN users_teams as ut ON r.team_id=ut.team_id
INNER JOIN users as u ON u.id=ut.user_id
WHERE r.uses_team=TRUE
AND r.archived=FALSE
AND ut.pending=FALSE
ORDER BY r.client_name

-- Integration users with no team associated with
SELECT
    r.id,
    r.client_name,
    r.user_id,
    r.service_type,
    u.idir_email,
    u.additional_email
FROM
    requests as r
INNER JOIN users as u ON u.id=r.user_id
WHERE r.uses_team=FALSE
AND r.archived=FALSE
ORDER BY r.client_name
```

## Release Process

- Create a pull request from `dev` to `main` and update pull request labels to choose a specific type of release
- `release:major` - will create a major release (example: `v1.0.0` -> `v2.0.0`)
- `release:minor` - will create a minor release (example: `v1.0.0` -> `v1.1.0`)
- `release:patch` - will create a patch release (example: `v1.0.0` -> `v1.0.1`)
- `release:norelease` - will not trigger any release

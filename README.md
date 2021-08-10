# sso-requests

The request process workflow tool for the RedHat SSO Dev Exchange service

## About

This is a tool to streamline the single-sign-on request process for new keycloak clients.
It consists of:

- A react frontend hosted on github pages. See the `/app` subdirectory for more.
- A serverless AWS backend, including lambda functions, API gateway, and an RDS database using postgres.
  All AWS resources are defined in terraform and can be found in the `/terraform` subdirectory, while
  the code for the lambda functions are in the `/lambda` subdirectory.
- Github actions scripts that handle the creation of clients through terraform, as well as communitcate
  events to the backend. For the development environment, scripts can be found in the `sso-terraform-dev` repository.
  **Note**: The creation of the _keycloak clients_ takes place in a separate repository (sso-terraform-dev for the dev environment
  and sso-terraform for prod) and this application uses _github actions_ in those repositories to handle the actual creation of the clients.

## Workflow

The general workflow for new client creation is:

1. A user authenticates with their IDIR and fills in a form for their new client
2. Data is validated in the backend lambda function (see `lambda/app`) and a new github workflow is kicked off. See the [dev workflow](https://github.com/bcgov/sso-terraform-dev/blob/main/.github/workflows/request.yml) request.yml file for details.
3. The request generates terraform files for the new client and creates a pull request to the default branch. The event (pr creation event) is logged to to the lambda backend. The pull request is labelled as `auto-generated`.
4. New pull requests start the [terraform workflow](https://github.com/bcgov/sso-terraform-dev/blob/main/.github/workflows/terraform.yml). This workflow
   will run `terraform plan`, and validate that the resources created follow reasonable constraints. If the plan is valid, it will auto-merge the pull request. A terraform-plan event is logged to the backend.
5. Merge events to main also trigger the [terraform workflow](https://github.com/bcgov/sso-terraform-dev/blob/main/.github/workflows/terraform.yml).
   Terraform will attempt to apply the changes, creating a new client. An `apply` event will be logged to the backend.

The process for updating clients is similar (see the [github scripts](https://github.com/bcgov/sso-terraform-dev/blob/main/scripts) for more details).

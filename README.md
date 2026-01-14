# Common Hosted Single Sign-On

![Lifecycle:Stable](https://img.shields.io/badge/Lifecycle-Stable-97ca00) [![codecov](https://codecov.io/gh/bcgov/sso-requests/graph/badge.svg?token=CAJYE46GZV)](https://codecov.io/gh/bcgov/sso-requests)

## Introduction

Common Hosted Single Sign-On (CSS) is an self-serve application developed by Pathfinder SSO Team to enable digital product development teams to request integrations with BC Government approved login options such as IDIR, BCeID and more. See our [usage documentation](https://mvp.developer.gov.bc.ca/docs/default/component/css-docs/) for details on using the application.

## Architecture

![diagram](./assets/css-arch-2026.svg)

### Legend

1. **End users** access the CSS web application via the browser.
2. **Service accounts** authenticate and interact with the CSS API.
3. **CSS Application (Web Portal)**
   The primary user-facing web application built with **Next.js**.
   - Source code: [./app](./app/)
   - Deployment configuration: [./helm/templates/deployment.yaml](./helm/templates/deployment.yaml)
4. **CSS API**
   A programmatic API for service accounts, built with **Express.js**.
   - Source code: [./api/](/api/)
   - Deployment configuration: [./helm/templates/deployment-api.yaml](./helm/templates/deployment-api.yaml)
5. **PostgreSQL Database**
   A highly available PostgreSQL cluster managed by **Patroni**, serving as the primary data store.
   - Deployed as a Helm chart dependency ([./helm/Chart.yaml](./helm/Chart.yaml))
6. **Redis Cluster**
   Used for rate limiting by both the CSS Application and CSS API.
   - Deployed as a Helm chart dependency ([./helm/Chart.yaml](./helm/Chart.yaml))
7. **Cron Jobs Service**
   A Node.js service responsible for scheduled tasks such as data reconciliation and cleanup.
   - Source code: `./cron/`
   - Deployment configuration: ([./helm/templates/deployment-cron.yaml](./helm/templates/deployment-cron.yaml))
8. **CSS API → Keycloak**
   The CSS API connects to **Dev, Test, and Production Keycloak** instances to perform configuration changes.
9. **CSS Application → Keycloak**
   The CSS Application connects to **Dev, Test, and Production Keycloak** instances to perform configuration changes.
10. **External Keycloak Instances (Not Shown)**
    Separate **Dev, Test, and Production Keycloak** environments managed outside this OpenShift namespace.

## Getting Started

The full web application, including keycloak instances to connect to, can be run locally with `docker-compose up`.

To setup a local development environment, a detailed guide may be found [here](./docs/developer-guide.md).

## Tests

- Run CSS App tests: `make app_test`
- Run CSS API tests: Initiate a test db if first time running with `make local_test_db`, then `make api_test`

## Release Process

- Create a pull request from `dev` to `main` and update pull request labels to choose a specific type of release
- `release:major` - will create a major release (example: `v1.0.0` -> `v2.0.0`)
- `release:minor` - will create a minor release (example: `v1.0.0` -> `v1.1.0`)
- `release:patch` - will create a patch release (example: `v1.0.0` -> `v1.0.1`)
- `release:norelease` - will not trigger any release

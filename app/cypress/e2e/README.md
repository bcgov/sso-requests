# Test Specs

This directory contains Cypress test specs.

To run the tests, run: `npx cypress run --browser "chrome"` from the root of the project (/testing). Or, you can run `npm run test`. This will run all of the tests in the `cypress/e2e` directory.
To only run the smoke tests use: `npx cypress run --spec 'cypress/e2e/**/smoke-*-*.cy.ts' --browser chrome`. Or, you can run `npm run smoke`. This will run all of the smoke tests in the `cypress/e2e` directory.

It is important to specify the correct browser when running your tests. If you do not specify a browser, Cypress will try to run in Electron, which is not supported by the application.

## User Accounts

There are a few different user accounts used to test out different integrations and IDPs, found in [the sample env file](../../sample.cypress.env.json):

- username/password: This is for a standard IDIR account
- adminUsername/adminPassword: This is an IDIR account that has admin rights in our sandbox app.
- externalGithubUsername/externalGithubPassword: This is for a github account that is not part of the bcgov-sso organization. Note that in our sandbox environments, the bcgov-sso organization is used to replicate functionality for the BCGov Github IDP, e.g only users in this org can log into that IDP.
- internalGithubUsername/internalGithubPassword: Similar to above, but this account is part of the bcgov-sso organization.

Credentials for these can be found in secrets in our tools namespace.

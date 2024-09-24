## SSO requests - frontend app

### E2E tests

To run the e2e tests, first create a file `cypress.env.json` in the `app` directory. For the contents, see the sso-requests-e2e-secrets secret in the tools namespace. Then:

1. Run `yarn` form the app directory if not installed npm dependencies yet
1. Start a local app and keycloak instances with `docker-compose up` from the root directory.
1. Once running, run `npx cypress open` from the `app` directory. This will open a UI where you can choose which testfile to run

# CSS api

## Local development

This api can be run independently from the rest of the css application. In the api folder create a copy of the `.env.example` file and populate it with values. If running against the sandbox keycloak instances, credentials can be retrieved from the "sso-request" secret hosted in the `b29129-dev` namespace.

The local env can be run with the command:

```
yarn dev
```

## Queries against the api

See the docs folder for [api-endpoint](../docs/api-endpoints.md)

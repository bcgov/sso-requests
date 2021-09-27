# SPA Example

This is an example vuejs SPA with python backend using [fastAPI](https://fastapi.tiangolo.com/).

To run locally, first create a public keycloak client that allows redirects to `localhost:3000` and add the installation JSON to
`services/frontend/public/keycloak.json`. For the backend connection,
add the `.well-known` endpoint to the docker compose file.

Then to start the app, run `docker-compose up`.

## Keycloak

The frontend for this project uses the `keycloak-js` library. The backend
verifies the idToken signature against a fetched JWK.

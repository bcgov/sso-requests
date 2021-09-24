# Examples

## nextjs-example

An example SPA app with a public client and backend API. To run this example,
you will need a public keycloak client you can use. If you have generated one with
our self-service [webapp](https://bcgov.github.io/sso-requests/), copy the
installation json you receive into `public/keycloak.json`. To run locally
ensure that your client allows `http://localhost:3000` as a valid
redirect URI. Then from `examples/nextjs-example`:

- **Build Image**: `docker build -t kc-demo .`
- **Run Image**: `docker run -p 3000:3000 kc-demo`

Visit `localhost:3000` on your machine to test it out.

# Confidential-express

An example express app with a confidential client. To run this example,
you will need a confidential keycloak client you can use. If you have generated one with
our self-service [webapp](https://bcgov.github.io/sso-requests/), copy the
installation json you receive into `keycloak.json`. To run locally
ensure that your client allows `http://localhost:3000` as a valid
redirect URI. Then from `examples/nextjs-example`:

- **Build Image**: `docker build -t kc-demo .`
- **Run Image**: `docker run -p 3000:3000 kc-demo`

Visit `localhost:3000` on your machine to test it out.

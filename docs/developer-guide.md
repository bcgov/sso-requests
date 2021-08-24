# Developer Guide

This guide is intended for developers looking to use this application to integrate with keycloak using OpenID Connect. Please note that
the [keycloak documentation](https://www.keycloak.org/docs/latest/securing_apps/index.html) is a comprehensive resoure
you can use for additional information.

## Requesting an integration

This application allows you to request integrations with keycloak. In order to request an integration,
there are a few fields you will need to understand:

**SSO Client Type**: This can be set to either public or confidential. Confidential clients are recommended for additional
security, but require a secret that would have to be kept on the server-side. If your application is entirely client-side, you will need
a public client. For more information on the client-side adapter, see [here](https://www.keycloak.org/docs/latest/securing_apps/index.html#_javascript_adapter).

**Redirect URIs (dev, test, prod)**: Valid URIs that a browser can redirect to after login/logout. These fields are required,
but can be changed at a later time if you are unsure what to use. Using a valid URI such as http://localhost:1000 as a temporary
value will work.

## Connect to Keycloak using an adapter

Once your request has been completed, you will be able to download your installation file for each environment. _**Note**: This file
is referred to as the `Keycloak OIDC JSON` in the keycloak documentation_. It can be used with keycloak adapters
to quickly setup your application. Keycloak has adapters for a number of languages, including java, javascript and C#.
For a list of adapters and how to connect see [here](https://www.keycloak.org/docs/latest/securing_apps/index.html#openid-connect).

## Connecting without an adapter

_See [here](https://www.keycloak.org/docs/latest/securing_apps/index.html#other-openid-connect-libraries) for keycloak documentation_

If you are not using an adapter, you will require some additional information to set up your OpenID connection. Required information
can be found behind the publicly accessible `.well-known` endpoint for your environment. These are:

- **Dev**: https://dev.oidc.gov.bc.ca/auth/realms/onestopauth/.well-known/openid-configuration
- **Test**: https://test.oidc.gov.bc.ca/auth/realms/onestopauth/.well-known/openid-configuration
- **Prod**: https://oidc.gov.bc.ca/auth/realms/onestopauth/.well-known/openid-configuration

Depending on the library you are using, it may only require this url, or additional information from the JSON response. The JSON response
lists the realm-level endpoints you will require, such as the `authorization-endpoint` and `token-endpoint`. Please see
[here](https://www.keycloak.org/docs/latest/securing_apps/index.html#endpoints) for a full list of endpoints and their descriptions.

Application specific information, such as the `client-id`, can be found from the installation JSON that
you can download from our app for each environment. Note that in the JSON we provide, the `resource` key is your `client-id`.

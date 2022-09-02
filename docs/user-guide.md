# Developers Guide

## Audience

This guide is intended for developers looking to integrate with keycloak using OpenID Connect (OIDC).

## Technical Overview

The following links are a good overview for integrating with keycloak:

- [General Overview](https://www.keycloak.org/docs/latest/securing_apps/index.html)
- [OIDC Protocol](https://www.keycloak.org/docs/latest/securing_apps/index.html#openid-connect-2)
- [Supported Platforms](https://www.keycloak.org/docs/latest/securing_apps/index.html#supported-platforms)
- [Core concepts and Terms](https://www.keycloak.org/docs/latest/server_admin/#core-concepts-and-terms)

### Glossary

We will make use of the following terms in this document:

- **Identity Provider**: An identity provider (IDP) is a service that can authenticate a user. IDIR and BCeID are identity providers.

- **Realms**: A keycloak realm manages a set of users, credentials, roles, groups and IDPs.

- **Standard Realms**: Configured realms that support different IDPs. Currently integration with IDIR is supported in the `onestopauth` standard realm.

- **Clients**: Clients are entities that can request Keycloak to authenticate a user. Most often, clients are applications and services that want to use Keycloak to secure themselves and provide a single sign-on solution. This application will generate a client for you in one of the standard realms.

- **Client Adapters**: Client adapters are plugins that you install into your application environment to be able to communicate and be secured by Keycloak. Keycloak has a number of adapters for different platforms that you can download. There are also third-party adapters you can get for environments that we don’t cover.

- **Installation JSON**: The JSON file you can use to connect with a **client adapter**. This is the same JSON that is available from
  the installation tab of a client in the keycloak application, under `Keycloak OIDC JSON`.

## Requesting an Integration

This service can be used to request an integration into one of the standard realms.

When you request an integration, new clients will be created for you under **Dev**, **Test**, and **Prod** environments, and
you will be able to download the **Installation JSON** for each one. To complete the request, you will need to know the following information:

- **Are you the product owner or project admin/team lead**: At this time we can only process access requests submittted by product owners, project admin or team leads. If you are not acting in one of these roles, please get in touch with these individuals in your organization to make the request for you.

- **What Project the Integration is for**: An identifier for your project, this will be used to generate your client id so should be meaningful.

- **Preferred Email Address**: This email address will be used to send updates on your requests status.

**SSO Client Type**: This can be set to either public or confidential. Confidential clients are recommended for additional
security, but require a secret that would have to be kept on the server-side. If your application is entirely client-side, you will need
a public client. For more information on the client-side adapter, see [here](https://www.keycloak.org/docs/latest/securing_apps/index.html#_javascript_adapter).

**Redirect URIs (dev, test, prod)**: Valid URIs that a browser can redirect to after login/logout. These fields are required,
but can be changed at a later time if you are unsure what to use. Using a valid URI such as http://localhost:1000 as a temporary
value will work.

## Using your Integration

### Connecting to Keycloak using an adapter

Once your request has been completed, you will be able to download your installation file for each environment. It can be used with keycloak adapters
to quickly setup your application. Keycloak has adapters for a number of languages, including java, javascript and C#.
For a list of adapters and instructions on how to connect see [here](https://www.keycloak.org/docs/latest/securing_apps/index.html#openid-connect).

### Connecting without an adapter

_See [here](https://www.keycloak.org/docs/latest/securing_apps/index.html#other-openid-connect-libraries) for keycloak documentation_

If you are not using an adapter, you will require some additional information to set up your OpenID connection. Required information
can be found behind the publicly accessible `.well-known` endpoint for your environment.
Based on our integration with us, you will either have your integration connected to our Silver (soon to be deprecated) offering or our Gold (the place to be) offering. Reach out to us if you have questions.

##### Silver Service

These are:

- **Dev**: https://dev.oidc.gov.bc.ca/auth/realms/< realm_name >/.well-known/openid-configuration
- **Test**: https://test.oidc.gov.bc.ca/auth/realms/< realm_name >/.well-known/openid-configuration
- **Prod**: https://oidc.gov.bc.ca/auth/realms/< realm_name >/.well-known/openid-configuration

Where < realm_name > needs to be replaced with the standard realm you are using, one of:

- onestopauth (For IDIR only)
- onestopauth-basic (For IDIR and BCeID basic)
- onestopauth-business (For IDIR and BCeID business)
- onestopauth-both (For IDIR and BCeID basic and business)

##### Gold Service

These are:

- **Dev**: https://dev.loginproxy.gov.bc.ca/auth/realms/standard/.well-known/openid-configuration
- **Test**: https://test.loginproxy.gov.bc.ca/auth/realms/standard/.well-known/openid-configuration
- **Prod**: https://loginproxy.gov.bc.ca/auth/realms/standard/.well-known/openid-configuration

##### JSON response

Depending on the library you are using, it may only require this url, or additional information from the JSON response. The JSON response
lists the realm-level endpoints you will require, such as the `authorization-endpoint` and `token-endpoint`. Please see
[here](https://www.keycloak.org/docs/latest/securing_apps/index.html#endpoints) for a full list of endpoints and their descriptions.

Application specific information, such as the `client-id`, can be found from the installation JSON that
you can download from our app for each environment. Note that in the JSON we provide, the `resource` key is your `client-id`.

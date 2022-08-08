import { Request } from '../interfaces/Request';
import { Schema } from './index';

export default function getSchema(integration: Request) {
  const { protocol, authType, status } = integration;
  const applied = status === 'applied';

  const protocolSchema = {
    type: 'string',
    title: 'Select Client Protocol',
    enum: ['oidc', 'saml'],
    enumNames: ['OpenID Connect', 'SAML'],
  };

  let authTypeSchema = {};
  let clientTypeSchema = {};

  if (protocol === 'oidc') {
    authTypeSchema = {
      type: 'string',
      title: 'Select Usecase',
      enum: ['browser-login', 'service-account', 'both'],
      enumNames: ['Browser Login', 'Service Account', 'Browser Login and Service Account'],
      tooltip: applied
        ? null
        : {
            content: `Note that once this is submitted, you will not be able to update and rather will need to create a new integration.`,
          },
      tooltips: [
        {
          content: `This enables standard OpenID Connect redirect based authentication with authorization code. In terms of OpenID Connect or OAuth2 specifications, this enables support of 'Authorization Code Flow' for this client.`,
        },
        {
          content: `This allows you to authenticate this client to Keycloak and retrieve access token dedicated to this client. In terms of OAuth2 specification, this enables support of 'Client Credentials Grant' for this client.`,
        },
        {
          content: `This enables 'Browser Login' and 'Service Account' both.`,
        },
      ],
    };

    clientTypeSchema =
      authType === 'browser-login'
        ? {
            type: 'boolean',
            title: 'Select Client Type',
            enum: [true, false],
            enumNames: ['Public', 'Confidential'],
          }
        : {};
  }

  const devIdpsSchema =
    authType === 'service-account'
      ? {}
      : {
          type: 'array',
          minItems: 1,
          title: 'Choose Identity Provider(s)',
          items: {
            type: 'string',
            enum: ['idir', 'azureidir', 'bceidbasic', 'bceidbusiness', 'bceidboth'],
            enumNames: ['IDIR', 'IDIR (Azure)', 'BCeID Basic', 'BCeID Business', 'BCeID Both'],
          },
          tooltips: [
            null,
            {
              content: `Using Azure IDIR adds the benefit of MFA (multi-factor authentication). This is a step up security-wise from regular IDIR.`,
            },
          ],
          uniqueItems: true,
          tooltip: {
            content: `The identity providers you add will let your users authenticate with those services.`,
          },
        };

  const properties = {
    protocol: protocolSchema,
    authType: authTypeSchema,
    publicAccess: clientTypeSchema,
    devIdps: devIdpsSchema,
    environments: {
      type: 'array',
      minItems: 1,
      title: 'Choose Environment(s)',
      items: {
        type: 'string',
        enum: ['dev', 'test', 'prod'],
        enumNames: ['Development', 'Test', 'Production'],
      },
      uniqueItems: true,
      tooltip: {
        content: `We will provide a separate client for each environment you can select. Select the environments required for your project.`,
      },
    },
  };

  return {
    type: 'object',
    required: ['publicAccess'],
    headerText: 'Choose providers',
    stepText: 'Providers',
    properties,
  } as Schema;
}

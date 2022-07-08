import { Request } from '../interfaces/Request';
import { Schema } from './index';

export default function getSchema(integration: Request) {
  const { publicAccess, authType } = integration;
  const authTypeSchema =
    publicAccess === false
      ? {
          type: 'string',
          title: 'Select Confidential Client Type',
          enum: ['browser-login', 'service-account', 'both'],
          enumNames: ['Browser Login', 'Service Account', 'User Login and Service Account'],
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
        }
      : {};

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
    publicAccess: {
      type: 'boolean',
      title: 'Select Client Type',
      enum: [true, false],
      enumNames: ['Public', 'Confidential'],
    },
    authType: authTypeSchema,
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

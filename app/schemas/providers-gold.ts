import { Integration } from '../interfaces/Request';
import { Schema } from './index';
import { idpMap } from '@app/helpers/meta';

export default function getSchema(integration: Integration) {
  const { protocol, authType, status } = integration;
  const applied = status === 'applied';

  const protocolSchema = {
    type: 'string',
    title: 'Select Client Protocol',
    enum: ['oidc', 'saml'],
    enumNames: ['OpenID Connect', 'SAML'],
  };

  const properties: any = {
    protocol: protocolSchema,
  };

  const required = [];

  if (protocol === 'oidc') {
    properties.authType = {
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

    if (authType === 'browser-login') {
      properties.publicAccess = {
        type: 'boolean',
        title: 'Select Client Type',
        enum: [true, false],
        enumNames: ['Public', 'Confidential'],
      };
    }

    required.push('publicAccess');
  }

  if (authType !== 'service-account') {
    const idpEnum = ['idir', 'azureidir', 'bceidbasic', 'bceidbusiness', 'bceidboth', 'github'];
    const idpEnumNames = idpEnum.map((idp) => idpMap[idp]);

    properties.devIdps = {
      type: 'array',
      minItems: 1,
      title: 'Choose Identity Provider(s)',
      items: {
        type: 'string',
        enum: idpEnum,
        enumNames: idpEnumNames,
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
  }

  properties.environments = {
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
  };

  properties.additionalRoleAttribute = {
    type: 'string',
    title: 'Additional Role Attribute (optional)',
    tooltip: {
      content: `by default "client_roles" is the default attribute key name to include roles info, if you wish to include same info in another attribute, then use this`,
    },
    maxLength: 50,
  };

  return {
    type: 'object',
    headerText: 'Choose providers',
    stepText: 'Basic Info',
    properties,
    required,
  } as Schema;
}

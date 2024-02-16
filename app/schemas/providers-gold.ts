import { Integration } from '../interfaces/Request';
import { Schema } from './index';
import { idpMap } from '@app/helpers/meta';
import getConfig from 'next/config';
import { formatWikiURL } from '@app/utils/constants';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { include_digital_credential } = publicRuntimeConfig;

export default function getSchema(integration: Integration, context: { isAdmin?: boolean } = { isAdmin: true }) {
  const { protocol, authType, status } = integration;
  const applied = status === 'applied';

  const protocolSchema = {
    type: 'string',
    title: 'Select Client Protocol',
    enum: ['oidc', 'saml'],
    enumNames: ['OpenID Connect', 'SAML'],
    tooltip: {
      content: 'The OpenID Connect (OIDC) client protocol is recommended.',
    },
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
    const idpEnum = ['idir', 'azureidir', 'bceidbasic', 'bceidbusiness', 'bceidboth', 'githubpublic', 'githubbcgov'];

    /*
      Schemas are shared between lambda functions and client app to keep validations in sync.
      They set env vars differently though, process.env is used in lambdas but publicRuntimeConfig in client app.
      Need to check both to see if dc is allowed.
    */
    const include_dc = include_digital_credential === 'true' || process.env.INCLUDE_DIGITAL_CREDENTIAL === 'true';

    if (include_dc) {
      idpEnum.push('digitalcredential');
    }

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
      tooltips: idpEnum.map((idp) => {
        if (idp === 'azureidir') {
          return {
            content: `
            To learn the difference between IDIR and IDIR with MFA,
            <a href="${formatWikiURL(
              '/Our-Partners-the-Identity-Providers#idir-with-mfa',
            )}" target="_blank" title="IDIR vs IDIR with MFA">
            please visit our GitHub page about choosing an Identity Provider
            </a>
            `,
            hide: 3000,
          };
        }
        if (idp === 'digitalcredential') {
          return {
            content: `To learn more about using the Digital Credential option visit our <a href="${formatWikiURL(
              'Our-Partners-the-Identity-Providers#what-are-identity-providers',
            )}" target="_blank">additional information</a>.`,
            hide: 3000,
            alpha: true,
          };
        }
        return null;
      }),
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

  // It is expected behavior that for SAML clients, attribute created by client mapper of type client-role-list overrides attribute created by client scope mapper of the same type
  // However, for OIDC clients the attributes from both mappers co-exist
  properties.additionalRoleAttribute = {
    type: 'string',
    title: `${protocol === 'saml' ? 'Override' : 'Additional'} Role Attribute(optional)`,
    tooltip: {
      content: `by default "client_roles" is the default attribute key name to include roles info, ${
        protocol === 'saml'
          ? 'if you wish to override the key name then use this'
          : 'if you wish to include same info in another attribute, then use this'
      }`,
    },
    maxLength: 50,
  };

  if (protocol === 'saml' && context.isAdmin) {
    properties.clientId = {
      type: 'string',
      title: 'As SSO Admin. you can override the client id',
      tooltip: {
        content: `The client id should be a string without any spaces`,
      },
      maxLength: 250,
    };
  }

  return {
    type: 'object',
    customValidation: ['additionalRoleAttribute', 'clientId', 'devIdps'],
    headerText: 'Choose providers',
    stepText: 'Basic Info',
    properties,
    required,
  } as Schema;
}

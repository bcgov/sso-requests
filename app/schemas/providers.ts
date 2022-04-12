import { Request } from '../interfaces/Request';
import { Schema } from './index';

export const redirectUriTooltip = {
  content: `At least one redirect URI is required for each of DEV, TEST and PROD. If you don't know the redirect URI for one or
  more of these environments, you may provide any valid URI for now and change it later. We suggest something like
  'http://localhost:1000'.`,
};

export const redirectUriItems = { type: 'string', maxLength: 250, placeholder: 'e.g. https://example.com' };

const allowDeleteFirstIfHasMoreThanOneItems = (arr: string[]) => (arr.length > 1 ? 0 : 1);

const commonRedirectUris = {
  type: 'array',
  items: redirectUriItems,
  additionalItems: redirectUriItems,
  deletableIndex: allowDeleteFirstIfHasMoreThanOneItems,
  default: [''],
  addItemText: 'Add another URI',
};

const testValidRedirectUris = {
  ...commonRedirectUris,
  title: 'Test Redirect URIs',
};

const prodValidRedirectUris = {
  ...commonRedirectUris,
  title: 'Prod Redirect URIs',
};

export const devValidRedirectUris = {
  ...commonRedirectUris,
  description: 'You can use any valid URI for your redirect URIs.',
  title: 'Dev Redirect URIs',
  tooltip: redirectUriTooltip,
};

export default function getSchema(integration: Request) {
  const redirectUriProps: any = { devValidRedirectUris };
  if (integration?.environments?.includes('test')) redirectUriProps.testValidRedirectUris = testValidRedirectUris;
  if (integration?.environments?.includes('prod')) redirectUriProps.prodValidRedirectUris = prodValidRedirectUris;

  return {
    type: 'object',
    required: ['realm', 'publicAccess'],
    customValidation: ['devValidRedirectUris', 'testValidRedirectUris', 'prodValidRedirectUris'],
    headerText: 'Choose providers and provide URIs',
    stepText: 'Providers and URIs',
    properties: {
      publicAccess: {
        type: 'boolean',
        title: 'Choose SSO client type',
        enum: [true, false],
        enumNames: ['Public', 'Confidential'],
      },
      realm: {
        type: 'string',
        title: 'Identity Providers Required',
        tooltip: {
          content: 'The identity providers you add will let your users authenticate with those services.',
        },
        enum: ['onestopauth', 'onestopauth-basic', 'onestopauth-business', 'onestopauth-both'],
        enumNames: ['IDIR + IDIR Azure Beta', 'IDIR + BCeID Basic', 'IDIR + BCeID Business', 'IDIR + BCeID Both'],
      },
      environments: {
        type: 'array',
        minItems: 1,
        title: 'Environment(s)',
        tooltip: {
          content:
            'We will provide a separate client for each environment you select. Select the environments that are required for your project.',
        },
        items: {
          type: 'string',
          enum: ['dev', 'test', 'prod'],
          enumNames: ['Development', 'Test', 'Production'],
        },
        uniqueItems: true,
      },
      ...redirectUriProps,
    },
  } as Schema;
}

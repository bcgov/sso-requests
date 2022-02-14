import { JSONSchema6 } from 'json-schema';

export const redirectUriTooltipInfo = {
  tooltipContent: `At least one redirect URI is required for each of DEV, TEST and PROD. If you don't know the redirect URI for one or
  more of these environments, you may provide any valid URI for now and change it later. We suggest something like
  'http://localhost:1000'.`,
};

export const redirectUriItems = { type: 'string', maxLength: 250, placeholder: 'e.g. https://example.com' };

const allowDeleteFirstIfHasMoreThanOneItems = (arr: string[]) => (arr.length > 1 ? 0 : 1);

const testValidRedirectUris = {
  type: 'array',
  title: 'Test Redirect URIs',
  items: redirectUriItems,
  additionalItems: redirectUriItems,
  deletableIndex: allowDeleteFirstIfHasMoreThanOneItems,
  default: [''],
  addItemText: 'Add another URI',
};

const prodValidRedirectUris = {
  type: 'array',
  title: 'Prod Redirect URIs',
  items: redirectUriItems,
  additionalItems: redirectUriItems,
  deletableIndex: allowDeleteFirstIfHasMoreThanOneItems,
  default: [''],
  addItemText: 'Add another URI',
};

const devValidRedirectUris = {
  type: 'array',
  description: 'You can use any valid URI for your redirect URIs.',
  title: 'Dev Redirect URIs',
  items: redirectUriItems,
  additionalItems: redirectUriItems,
  deletableIndex: allowDeleteFirstIfHasMoreThanOneItems,
  default: [''],
  addItemText: 'Add another URI',
  ...redirectUriTooltipInfo,
};

const dev = {
  type: 'boolean',
  enum: [true, false],
  default: true,
  title: 'Development',
  displayTitle: 'Environments',
  tooltipContent:
    'We will provide a separate client for each environment you select. Select the environments that are required for your project.',
};

const test = {
  type: 'boolean',
  title: 'Test',
  enum: [true, false],
};

const prod = {
  type: 'boolean',
  title: 'Production',
  enum: [true, false],
};

export default {
  type: 'object',
  required: ['realm', 'publicAccess'],
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
      tooltipContent: 'The identity providers you add will let your users authenticate with those services.',
      enum: ['onestopauth', 'onestopauth-basic', 'onestopauth-business', 'onestopauth-both'],
      enumNames: ['IDIR + IDIR Azure Beta', 'IDIR + BCeID Basic', 'IDIR + BCeID Business', 'IDIR + BCeID Both'],
    },
    dev,
    test,
    prod,
    devValidRedirectUris,
  },
  dependencies: {
    test: {
      oneOf: [
        {
          properties: {
            test: {
              enum: [true],
            },
            testValidRedirectUris,
          },
        },
        {
          properties: {
            test: {
              enum: [false],
            },
          },
        },
      ],
    },
    prod: {
      oneOf: [
        {
          properties: {
            prod: {
              enum: [true],
            },
            prodValidRedirectUris,
          },
        },
        {
          properties: {
            prod: {
              enum: [false],
            },
          },
        },
      ],
    },
  },
} as JSONSchema6;

import { JSONSchema6 } from 'json-schema';

export const redirectUriTooltipInfo = {
  tooltipContent: `At least one redirect URI is required for each of DEV, TEST and PROD. If you don't know the redirect URI for one or
  more of these environments, you may provide any valid URI for now and change it later. We suggest something like
  'http://localhost:1000'.`,
};

export const redirectUriItems = { type: 'string', maxLength: 250, placeholder: 'e.g. https://example.com' };

export default {
  type: 'object',
  required: ['realm', 'publicAccess'],
  properties: {
    publicAccess: {
      type: 'boolean',
      title: 'Choose SSO client type',
      tooltipContent:
        'A public client with PKCE is slightly less secure because there is no secret, but this configuration is required by some architectures and is supported as well.</br></br>With a confidential client, the back-end component securely stores an application secret that allows it to communicate with the KeyCloak server to facilitate the OIDC authentication process.',
      enum: [true, false],
      enumNames: ['Public', 'Confidential'],
    },
    realm: {
      type: 'string',
      title: 'Identity Providers Required',
      tooltipContent: 'The identity providers you add will let your users authenticate with those services.',
      enum: ['onestopauth', 'bceidbasic', 'bceidbusiness', 'bceidboth'],
      enumNames: [
        'IDIR',
        'IDIR + BCeID Basic (coming soon)',
        'IDIR + BCeID Business (coming soon)',
        'IDIR + BCeID Both (coming soon)',
      ],
      default: 'onestopauth',
    },
    environments: {
      type: 'string',
      title: 'Environments',
      tooltipContent: "Choose environments to have separate SSO instances for your application's development, testing, and produtcion phases.",
      enum: [['dev'], ['dev, test'], ['dev', 'test', 'prod']],
      enumNames: ['dev', 'dev & test', 'dev & test & prod'],
      uniqueItems: true,
      default: ['dev'],
    },
    devValidRedirectUris: {
      type: 'array',
      description: 'You can use any valid URI for your redirect URIs.',
      title: 'Dev Redirect URIs',
      items: redirectUriItems,
      additionalItems: redirectUriItems,
      default: [''],
      addItemText: 'Add another URI',
      ...redirectUriTooltipInfo,
    },
  },
  dependencies: {

    realm: {
      oneOf: [
        {
          properties: {
            realm: {
              enum: ['bceidbasic']
            },
            environments: {
              type: 'string',
              title: 'Environments',
              enum: ['dev', 'dev & test'],
              uniqueItems: true,
              default: ['dev'],
            }
          }
        },
        {
          properties: {
            realm: {
              enum: ['bceidbusiness']
            },
            environments: {
              type: 'string',
              title: 'Environments',
              enum: ['dev', 'dev & test'],
              uniqueItems: true,
              default: ['dev'],
            }
          }
        },
        {
          properties: {
            realm: {
              enum: ['bceidboth']
            },
            environments: {
              type: 'string',
              title: 'Environments',
              enum: ['dev', 'dev & test'],
              uniqueItems: true,
              default: ['dev'],
            }
          }
        },
      ]
    },

    environments: {
      oneOf: [
        {
          properties: {
            environments: {
              enum: ['dev & test'],
            },
            testValidRedirectUris: {
              type: 'array',
              title: 'Test Redirect URIs',
              items: redirectUriItems,
              additionalItems: redirectUriItems,
            },
          },
        },
        {
          properties: {
            environments: {
              enum: ['dev & test & prod'],
            },
            testValidRedirectUris: {
              type: 'array',
              title: 'Test Redirect URIs',
              items: redirectUriItems,
              additionalItems: redirectUriItems,
            },
            prodValidRedirectUris: {
              type: 'array',
              title: 'Prod Redirect URIs',
              items: redirectUriItems,
              additionalItems: redirectUriItems,
              default: [''],
              addItemText: 'Add another URI',
            },
          },
        },
      ],
    },
  },
} as JSONSchema6;

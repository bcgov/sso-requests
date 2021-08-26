import { JSONSchema6 } from 'json-schema';

export const redirectUriTooltipInfo = {
  tooltipTitle: 'Redirect URIs',
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
      tooltipTitle: 'Client Types',
      tooltipContent:
        'A public client with PKCE is slightly less secure because there is no secret, but this configuration is required by some architectures and is supported as well.</br></br>With a confidential client, the back-end component securely stores an application secret that allows it to communicate with the KeyCloak server to facilitate the OIDC authentication process.',
      enum: [true, false],
      enumNames: ['Public', 'Confidential'],
    },
    realm: {
      type: 'string',
      title: 'Identity Providers Required',
      tooltipTitle: 'Identity Providers',
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
    devValidRedirectUris: {
      type: 'array',
      description: 'You can use any valid URI for your redirect URIs.',
      title: 'Dev Redirect URIs',
      items: redirectUriItems,
      additionalItems: redirectUriItems,
      default: [''],
      ...redirectUriTooltipInfo,
    },
    testValidRedirectUris: {
      type: 'array',
      title: 'Test Redirect URIs',
      items: redirectUriItems,
      additionalItems: redirectUriItems,
      default: [''],
    },
    prodValidRedirectUris: {
      type: 'array',
      title: 'Prod Redirect URIs',
      items: redirectUriItems,
      additionalItems: redirectUriItems,
      default: [''],
    },
  },
} as JSONSchema6;

import { JSONSchema6 } from 'json-schema';

export default {
  type: 'object',
  required: ['devValidRedirectUris', 'testValidRedirectUris', 'prodValidRedirectUris', 'realm'],
  properties: {
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
    },
    devValidRedirectUris: {
      type: 'array',
      description: 'You can use any valid URI for your redirect URIs.',
      title: 'Dev Redirect URIs',
      items: { type: 'string' },
      additionalItems: { type: 'string' },
      default: [''],
    },
    testValidRedirectUris: {
      type: 'array',
      title: 'Test Redirect URIs',
      items: { type: 'string' },
      additionalItems: { type: 'string' },
      default: [''],
    },
    prodValidRedirectUris: {
      type: 'array',
      title: 'Prod Redirect URIs',
      items: { type: 'string' },
      additionalItems: { type: 'string' },
      default: [''],
    },
  },
} as JSONSchema6;

import { JSONSchema7 } from 'json-schema';

export const urlPattern = `^https?:\\/\\/\\w+(\\.\\w+)*(:[0-9]+)?\\/?$`;

export default {
  type: 'object',
  required: ['devRedirectUrls', 'testRedirectUrls', 'prodRedirectUrls'],
  properties: {
    realm: {
      type: 'string',
      title: 'Identity Providers Required',
      enum: ['onestopauth', 'bceidbasic', 'bceidbusiness', 'bceidboth'],
      enumNames: [
        'IDIR/GitHub',
        'IDIR/GitHub + BCeID Basic',
        'IDIR/GitHub + BCeID Business',
        'IDIR/GitHub + BCeID Both',
      ],
      default: 'onestopauth',
    },
    devRedirectUrls: {
      type: 'array',
      description: 'You can use any valid URI for your redirect URIs.',
      title: 'Dev Redirect URIs',
      items: { type: 'string', pattern: urlPattern },
      additionalItems: { type: 'string', pattern: urlPattern },
      default: [''],
    },
    testRedirectUrls: {
      type: 'array',
      title: 'Test Redirect URIs',
      items: { type: 'string', pattern: urlPattern },
      additionalItems: { type: 'string', pattern: urlPattern },
      default: [''],
    },
    prodRedirectUrls: {
      type: 'array',
      title: 'Prod Redirect URIs',
      items: { type: 'string', pattern: urlPattern },
      additionalItems: { type: 'string', pattern: urlPattern },
      default: [''],
    },
  },
} as JSONSchema7;

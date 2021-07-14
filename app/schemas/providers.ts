import { JSONSchema7 } from 'json-schema';

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
      title: 'Dev Redirect Urls',
      items: { type: 'string', format: 'url' },
      additionalItems: { type: 'string' },
      default: [''],
    },
    testRedirectUrls: {
      type: 'array',
      title: 'Test Redirect Urls',
      items: { type: 'string', format: 'url' },
      additionalItems: { type: 'string' },
      default: [''],
    },
    prodRedirectUrls: {
      type: 'array',
      title: 'Prod Redirect Urls',
      items: { type: 'string', format: 'url' },
      additionalItems: { type: 'string' },
      default: [''],
    },
  },
} as JSONSchema7;

import { JSONSchema7 } from 'json-schema';

export default {
  type: 'object',
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
  },
} as JSONSchema7;

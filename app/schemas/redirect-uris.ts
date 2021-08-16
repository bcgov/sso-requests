import { JSONSchema6 } from 'json-schema';

export default {
  type: 'object',
  properties: {
    devValidRedirectUris: {
      type: 'array',
      title: 'Development',
      items: { type: 'string' },
      additionalItems: { type: 'string' },
      default: [''],
    },
    testValidRedirectUris: {
      type: 'array',
      title: 'Test',
      items: { type: 'string' },
      additionalItems: { type: 'string' },
      default: [''],
    },
    prodValidRedirectUris: {
      type: 'array',
      title: 'Production',
      items: { type: 'string' },
      additionalItems: { type: 'string' },
      default: [''],
    },
  },
} as JSONSchema6;

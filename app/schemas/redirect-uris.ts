import { JSONSchema6 } from 'json-schema';

export default {
  type: 'object',
  required: ['devValidRedirectUris', 'testValidRedirectUris', 'prodValidRedirectUris'],
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

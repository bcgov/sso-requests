import { JSONSchema6 } from 'json-schema';

export const urlPattern = `^https?:\\/\\/\\w+(\\.\\w+)*(:[0-9]+)?\\/?$`;

export default {
  type: 'object',
  required: ['devValidRedirectUris', 'testValidRedirectUris', 'prodValidRedirectUris'],
  properties: {
    devValidRedirectUris: {
      type: 'array',
      title: 'Development',
      items: { type: 'string', pattern: urlPattern },
      additionalItems: { type: 'string', pattern: urlPattern },
      default: [''],
    },
    testValidRedirectUris: {
      type: 'array',
      title: 'Test',
      items: { type: 'string', pattern: urlPattern },
      additionalItems: { type: 'string', pattern: urlPattern },
      default: [''],
    },
    prodValidRedirectUris: {
      type: 'array',
      title: 'Production',
      items: { type: 'string', pattern: urlPattern },
      additionalItems: { type: 'string', pattern: urlPattern },
      default: [''],
    },
  },
} as JSONSchema6;

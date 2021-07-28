import { JSONSchema7 } from 'json-schema';

export const urlPattern = `^https?:\\/\\/\\w+(\\.\\w+)*(:[0-9]+)?\\/?$`;

export default {
  type: 'object',
  required: ['devRedirectUrls', 'testRedirectUrls', 'prodRedirectUrls'],
  properties: {
    devRedirectUrls: {
      type: 'array',
      title: 'Development',
      items: { type: 'string', pattern: urlPattern },
      additionalItems: { type: 'string', pattern: urlPattern },
      default: [''],
    },
    testRedirectUrls: {
      type: 'array',
      title: 'Test',
      items: { type: 'string', pattern: urlPattern },
      additionalItems: { type: 'string', pattern: urlPattern },
      default: [''],
    },
    prodRedirectUrls: {
      type: 'array',
      title: 'Production',
      items: { type: 'string', pattern: urlPattern },
      additionalItems: { type: 'string', pattern: urlPattern },
      default: [''],
    },
  },
} as JSONSchema7;

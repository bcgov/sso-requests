import { JSONSchema6 } from 'json-schema';
import { redirectUriItems } from './shared/providers';

export default {
  type: 'object',
  properties: {
    devValidRedirectUris: {
      type: 'array',
      title: 'Development',
      items: redirectUriItems,
      additionalItems: redirectUriItems,
      default: [''],
    },
    testValidRedirectUris: {
      type: 'array',
      title: 'Test',
      items: redirectUriItems,
      additionalItems: redirectUriItems,
      default: [''],
    },
    prodValidRedirectUris: {
      type: 'array',
      title: 'Production',
      items: redirectUriItems,
      additionalItems: redirectUriItems,
      default: [''],
    },
  },
} as JSONSchema6;

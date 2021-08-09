import { JSONSchema6 } from 'json-schema';

export default {
  type: 'object',
  required: ['agreeWithTerms'],
  properties: {
    agreeWithTerms: {
      type: 'boolean',
      title: 'I agree to the Terms and Conditions',
      default: null,
      enum: [null, true],
    },
  },
} as JSONSchema6;

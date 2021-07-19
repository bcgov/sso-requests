import { JSONSchema7 } from 'json-schema';

export default {
  type: 'object',
  required: ['agreeWithTerms'],
  properties: {
    agreeWithTerms: { type: 'boolean', title: 'I agree to the Terms and Conditions' },
  },
} as JSONSchema7;

import { JSONSchema7 } from 'json-schema';

export default {
  type: 'object',
  required: ['agreeWithTerms'],
  properties: {
    agreeWithTerms: { type: 'boolean', title: 'Do you agree with the terms and conditions?' },
  },
} as JSONSchema7;

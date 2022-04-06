import { Schema } from './index';

export default {
  type: 'object',
  required: ['agreeWithTerms'],
  headerText: 'Terms and Conditions',
  stepText: 'Terms and Conditions',
  properties: {
    agreeWithTerms: {
      type: 'boolean',
      title: 'I agree to the Terms and Conditions',
      default: null,
      enum: [null, true],
    },
  },
} as Schema;

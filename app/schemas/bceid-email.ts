import { JSONSchema6 } from 'json-schema';

export default {
  type: 'object',
  required: ['realm', 'publicAccess'],
  properties: {
    bceidTo: {
      type: 'string',
      title: 'To',
    },
    bceidCc: {
      type: 'string',
      title: 'CC',
    },
    bceidBody: {
      type: 'string',
      description:
        'Please complete the information below for access to the prod environment. You will receive an email from IDIM with 2-3 business days, once they receive the information.',
      title: 'Email Body Text',
      rows: 10,
      fullWidth: true,
    },
  },
} as JSONSchema6;

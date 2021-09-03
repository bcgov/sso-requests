import { JSONSchema6 } from 'json-schema';

export default {
  type: 'object',
  required: ['comment'],
  properties: {
    comment: {
      type: 'string',
      title: 'Comment',
      fullWidth: true,
      rows: 4,
    },
  },
} as JSONSchema6;

import { JSONSchema6 } from 'json-schema';

export default {
  type: 'object',
  properties: {
    comment: {
      type: 'string',
      title: 'Comment',
      fullWidth: true,
      rows: 4,
    },
  },
} as JSONSchema6;

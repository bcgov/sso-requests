import { JSONSchema6 } from 'json-schema';

export default function getSchema() {
  return {
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
}

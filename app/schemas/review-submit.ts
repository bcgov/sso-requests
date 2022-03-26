import { Schema } from './index';

export default function getSchema() {
  return {
    type: 'object',
    headerText: 'Review and Submit',
    stepText: 'Review & Submit',
    properties: {
      comment: {
        type: 'string',
        title: 'Comment',
        fullWidth: true,
        rows: 4,
      },
    },
  } as Schema;
}

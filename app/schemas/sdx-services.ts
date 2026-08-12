import { Schema } from './index';

export default function getSdxServicesSchema() {
  return {
    type: 'object',
    headerText: 'Secure Data Exchange (SDX) Services',
    stepText: 'SDX Services',
    customValidation: ['sdxServices'],
    properties: {
      sdxServices: {
        type: 'object',
        fullWidth: true,
        rows: 4,
      },
    },
  } as Schema;
}

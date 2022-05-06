import { Request } from '../interfaces/Request';
import { Schema } from './index';

export default function getSchema(integration: Request) {
  return {
    type: 'object',
    required: ['publicAccess'],
    headerText: 'Choose providers',
    stepText: 'Providers',
    properties: {
      publicAccess: {
        type: 'boolean',
        title: 'Select Client Type',
        enum: [true, false],
        enumNames: ['Public', 'Confidential'],
      },
      devIdps: {
        type: 'array',
        minItems: 1,
        title: 'Choose Identity Provider(s)',
        items: {
          type: 'string',
          enum: ['idir', 'azureidir', 'bceidbasic', 'bceidbusiness', 'bceidboth'],
          enumNames: ['IDIR', 'IDIR (Azure)', 'BCeID Basic', 'BCeID Business', 'BCeID Both'],
        },
        uniqueItems: true,
      },
      environments: {
        type: 'array',
        minItems: 1,
        title: 'Choose Environment(s)',
        items: {
          type: 'string',
          enum: ['dev', 'test', 'prod'],
          enumNames: ['Development', 'Test', 'Production'],
        },
        uniqueItems: true,
      },
    },
  } as Schema;
}

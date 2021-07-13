import { JSONSchema7 } from 'json-schema';

export default {
  type: 'object',
  properties: {
    projectLead: { type: 'boolean', title: 'Are you the product owner or project admin/team lead?' },
  },
  dependencies: {
    projectLead: {
      oneOf: [
        {
          properties: {
            projectLead: { enum: [false] },
          },
        },
        {
          properties: {
            projectLead: { enum: [true] },
            lastName: { type: 'string', title: 'Last Name' },
            firstName: { type: 'string', title: 'First Name' },
            middleName: { type: 'string', title: 'Middle Name' },
            preferredEmail: { type: 'string', title: 'Business Email Address' },
            projectName: { type: 'string', title: 'Project Name' },
          },
        },
      ],
    },
  },
} as JSONSchema7;

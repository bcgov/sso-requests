import { JSONSchema7 } from 'json-schema';

export default {
  type: 'object',
  properties: {
    projectLead: { type: 'boolean', title: 'Are you the product owner or project admin/team lead?' },
  },
  required: ['projectLead', 'publicAccess', 'projectName', 'preferredEmail'],
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
            newToSso: { type: 'boolean', title: 'Have you requested an SSO project before?' },
            publicAccess: {
              type: 'boolean',
              title: 'Choose client type',
              enum: [true, false],
              enumNames: ['Public', 'Confidential'],
              default: false,
            },
            projectName: { type: 'string', title: 'Project Name' },
            preferredEmail: { type: 'string', title: 'Preferred Email Address', format: 'email' },
          },
        },
      ],
    },
  },
} as JSONSchema7;

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
            preferredEmail: { type: 'string', title: 'Business Email Address' },
            publicAccess: {
              type: 'string',
              title: 'Choose client type',
              enum: ['true', 'false'],
              enumNames: ['Public', 'Confidential'],
            },
            projectName: { type: 'string', title: 'Project Name' },
            newToSso: { type: 'boolean', title: 'Are you new to Single Sign-On (Keycloak)?' },
          },
        },
      ],
    },
  },
} as JSONSchema7;

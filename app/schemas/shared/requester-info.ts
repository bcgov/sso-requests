import { JSONSchema6 } from 'json-schema';

export default {
  type: 'object',
  properties: {
    projectLead: { type: 'boolean', title: 'Are you the product owner or project admin/team lead?' },
  },
  required: ['projectLead', 'projectName', 'preferredEmail', 'newToSso'],
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
            newToSso: {
              type: 'boolean',
              title: 'Have you requested an SSO integration before?',
              tooltipTitle: 'New To SSO',
              tooltipContent: `<p>If new to SSO, please visit <a style="color: #0000EE" href="https://github.com/bcgov/ocp-sso/wiki/Using-Your-SSO-Client" target="blank">github</a> for more information</p>`,
              hide: 2000,
            },
            projectName: { type: 'string', title: 'What Project is this integration for?' },
            preferredEmail: { type: 'string', title: 'Preferred Email Address', format: 'email' },
          },
        },
      ],
    },
  },
} as JSONSchema6;

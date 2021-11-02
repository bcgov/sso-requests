import { JSONSchema6 } from 'json-schema';

export default {
  type: 'object',
  properties: {
    projectLead: {
      type: 'boolean',
      title: 'Are you accountable for this project?',
      tooltipContent: `
      <p>
        Only the person who is responsible for this project should be submitting the integration request. 
        If you are not the one accountable, please refer this request to a team member who will be accountable for this project.
      </p>`,
    },
  },
  required: ['projectLead', 'projectName', 'preferredEmail'],
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
            projectName: { type: 'string', title: 'What Project is this integration for?', maxLength: 50 },
            preferredEmail: { type: 'string', title: 'Default Email Address', format: 'email', maxLength: 250 },
            additionalEmails: {
              type: ['array', 'null'],
              title: 'Additional Emails',
              items: { type: 'string', maxLength: 250, format: 'email' },
              additionalItems: { type: 'string', maxLength: 250, format: 'email' },
              deletableIndex: 0,
              maxItems: 2,
              addItemText: 'Add Email Address',
            },
          },
        },
      ],
    },
  },
} as JSONSchema6;

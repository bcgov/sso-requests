import { JSONSchema6 } from 'json-schema';

const projectLead = {
  type: 'boolean',
  title: 'Are you the product owner or technical contact for this project?',
  tooltipContent: `
<p>
  Only the person who is responsible for this project should be submitting the integration request. 
  If you are not the one accountable, please refer this request to a team member who will be accountable for this project.
</p>`,
};

const projectName = { type: 'string', title: 'Project Name', maxLength: 50 };
const preferredEmail = { type: 'string', title: 'Default Email Address', format: 'email', maxLength: 250 };
const additionalEmails = {
  type: ['array', 'null'],
  title: 'Additional Emails',
  items: { type: 'string', maxLength: 250, format: 'email' },
  additionalItems: { type: 'string', maxLength: 250, format: 'email' },
  deletableIndex: 0,
  maxItems: 2,
  addItemText: 'Add Email Address',
};

export default function getSchema(teams: any[] = []) {
  const teamNames = teams.map((team) => team.name);
  const teamValues = teams.map((team) => team.id);
  return {
    type: 'object',
    properties: {
      projectName,
      usesTeam: {
        type: 'boolean',
        title: 'Project Member(s)',
        description: 'Would you like to allow multiple members to manage this integration?',
      },
    },
    required: ['projectName', 'preferredEmail'],
    dependencies: {
      usesTeam: {
        oneOf: [
          {
            properties: {
              usesTeam: { enum: [false] },
              projectLead,
            },
          },
          {
            properties: {
              usesTeam: { enum: [true] },
              team: {
                type: 'string',
                title: 'Project Member(s)',
                enum: [null, ...teamValues],
                enumNames: ['-', ...teamNames],
              },
              preferredEmail,
              additionalEmails,
            },
          },
        ],
      },
      projectLead: {
        oneOf: [
          {
            properties: {
              projectLead: { enum: [true] },
              preferredEmail,
              additionalEmails,
            },
            required: ['projectLead'],
          },
        ],
      },
    },
  } as JSONSchema6;
}

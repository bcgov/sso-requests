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

export default function getSchema(teams: any[] = []) {
  const teamNames = teams.map((team) => team.name);
  const teamValues = teams.map((team) => String(team.id));
  const hasTeams = teams.length > 0;

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
    required: ['projectName'],
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
              ...(hasTeams && {
                teamId: {
                  type: 'string',
                  title: 'Project Team',
                  enum: teamValues,
                  enumNames: teamNames,
                  default: teamValues[0],
                },
              }),
              createTeam: {
                type: 'string',
              },
            },
          },
        ],
      },
      projectLead: {
        oneOf: [
          {
            properties: {
              projectLead: { enum: [true] },
            },
            required: ['projectLead'],
          },
          {
            properties: {
              projectLead: { enum: [false] },
            },
          },
        ],
      },
    },
  } as JSONSchema6;
}

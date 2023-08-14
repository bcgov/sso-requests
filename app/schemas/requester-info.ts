import { Schema } from './index';

const projectLead = {
  type: 'boolean',
  title: 'Are you the product owner or technical contact for this project?',
  tooltip: {
    content: `
    <p>
      Only the person who is responsible for this project should be submitting the integration request. 
      If you are not the one accountable, please refer this request to a team member who will be accountable for this project.
    </p>`,
  },
};

export default function getSchema(teams: any[] = []) {
  const teamNames = teams.map((team) => team.name);
  teamNames.unshift('Select...');
  const teamValues = teams.map((team) => String(team.id));
  teamValues.unshift('');
  const hasTeams = teams.length > 0;

  return {
    type: 'object',
    customValidation: ['createTeam', 'projectName', 'projectLead'],
    headerText: 'Enter requester information',
    stepText: 'Requester Info',
    properties: {
      projectName: { type: 'string', title: 'Project Name', maxLength: 50 },
      usesTeam: {
        type: 'boolean',
        title: 'Project Team',
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
  } as Schema;
}

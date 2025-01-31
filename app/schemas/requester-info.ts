import { Integration } from '@app/interfaces/Request';
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
  default: true,
};

const primaryEndUsers = {
  type: 'array',
  items: {
    type: 'string',
    enum: ['livingInBC', 'businessInBC', 'bcGovEmployees', 'other'],
  },
  uniqueItems: true,
  title: 'Who are the primary end users of your project/application? (select all that apply)',
};

export default function getSchema(teams: any[] = [], formData: Integration) {
  const teamValues = teams.map((team) => String(team.id));
  teamValues.unshift('');
  const hasTeams = teams.length > 0;
  const showOtherDetails = formData.primaryEndUsers?.includes('other');

  return {
    type: 'object',
    customValidation: ['createTeam', 'projectName', 'projectLead'],
    headerText: 'Enter requester information',
    stepText: 'Requester Info',
    properties: {
      projectName: { type: 'string', title: 'Project Name', maxLength: 50 },
      primaryEndUsers,
      ...(showOtherDetails && {
        primaryEndUsersOther: {
          type: 'string',
          title: 'Project Name',
          maxLength: 100,
          placeholder: 'Enter Details',
          rows: 3,
        } as any,
      }),
      usesTeam: {
        type: 'boolean',
        title: 'Project Team',
        description: 'Would you like to allow multiple members to manage this integration?',
        default: false,
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

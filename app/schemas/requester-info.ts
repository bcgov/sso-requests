import { JSONSchema6 } from 'json-schema';

export default {
  type: 'object',
  properties: {
    projectLead: { type: 'boolean', title: 'Are you the product owner or project admin/team lead?' },
  },
  required: ['projectLead', 'publicAccess', 'projectName', 'preferredEmail', 'newToSso'],
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
              tooltipTitle: 'Client Types',
              tooltipContent:
                'A public client with PKCE is slightly less secure because there is no secret, but this configuration is required by some architectures and is supported as well.</br></br>With a confidential client, the back-end component securely stores an application secret that allows it to communicate with the KeyCloak server to facilitate the OIDC authentication process.',
              enum: [true, false],
              enumNames: ['Public', 'Confidential'],
            },
            projectName: { type: 'string', title: 'Project Name (e.g. Mines Digitial Services)' },
            preferredEmail: { type: 'string', title: 'Preferred Email Address', format: 'email' },
          },
        },
      ],
    },
  },
} as JSONSchema6;

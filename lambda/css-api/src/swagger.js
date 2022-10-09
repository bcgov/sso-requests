const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const doc = {
  info: {
    version: '1.0.0',
    title: 'CSS SSO API',
    description: 'CSS SSO API Service by BC Gov SSO Team',
  },
  host: `${process.env.APP_ENV === 'production' ? 'api.loginproxy.gov.bc.ca' : 'api-dev.loginproxy.gov.bc.ca'}`,
  basePath: '/api/v1',
  schemes: ['https'],
  tags: [
    {
      name: 'Intergrations',
      description: 'Manage SSO Integrations',
    },
    {
      name: 'Roles',
      description: 'Manage Roles for an Integration',
    },
    {
      name: 'Role-Mapping',
      description: 'Manage Role-Mappings for an Integration',
    },
  ],
  components: {
    schemas: {
      integration: {
        id: 'number',
        projectName: 'string',
        authType: 'string',
        environments: 'string[]',
        status: 'string',
        createdAt: 'timestamp',
        updatedAt: 'timestamp',
      },
      roleRequest: {
        name: 'string',
      },
      roleResponse: {
        name: 'string',
        composite: 'boolean',
      },
      userAttribute: {
        attributeKey: 'string[]',
      },
      user: {
        username: 'string',
        email: 'string',
        firstName: 'string',
        lastName: 'string',
        attribues: [{ $ref: '#/components/schemas/userAttribute' }],
      },
      userRoleMappingRequest: {
        roleName: 'string',
        username: 'string',
        operation: 'add | del',
      },
    },
    securitySchemes: {
      oAuth2ClientCredentials: {
        type: 'oauth2',
        description: '',
        flows: {
          clientCredentials: {
            tokenUrl: `https://${process.env.CUSTOM_DOMAIN_NAME}/api/v1/token`,
            scopes: {},
          },
        },
      },
      accessToken: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      oAuth2ClientCredentials: [],
      accessToken: [],
    },
  ],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['src/routes.ts'];

/* NOTE: if you use the express Router, you must pass in the
   'endpointsFiles' only the root file where the route starts,
   such as index.js, app.js, routes.js, ... */

swaggerAutogen(outputFile, endpointsFiles, doc);

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
      // @ will ensure swagger-autogen shall not process it
      environments: {
        '@enum': ['dev', 'test', 'prod'],
      },
      operations: {
        '@enum': ['add', 'del'],
      },
      integration: {
        id: '1000',
        projectName: 'integration project name',
        authType: 'browser-login',
        environments: { $ref: '#/components/schemas/environments' },
        status: 'applied',
        createdAt: '2022-08-10T21:21:25.303Z',
        updatedAt: '2022-08-10T21:21:53.598Z',
      },
      roleRequest: {
        $name: 'client-role',
      },
      roleResponse: {
        name: 'client-role',
        composite: false,
      },
      compositeRoleRequest: [{ $ref: '#/components/schemas/roleRequest' }],
      userAttributes: {
        displayName: 'Test User',
        idir_userid: 'AAAFEE111DD24C6D11111DFDC8BC51A1',
      },
      user: {
        username: '08fe81112408411081ea011cf0ec945d@idir',
        email: 'testuser@gov.bc.ca',
        firstName: 'Test',
        lastName: 'User',
        attribues: { $ref: '#/components/schemas/userAttributes' },
      },
      userRoleMappingRequest: {
        $roleName: 'client-role',
        $username: '08fe81112408411081ea011cf0ec945d@idir',
        $operation: { $ref: '#/components/schemas/operations' },
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

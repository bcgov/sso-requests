const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const doc = {
  info: {
    version: '1.0.0',
    title: 'CSS SSO API',
    description: 'CSS SSO API Service by BC Gov SSO Team',
  },
  host: `${
    process.env.APP_ENV === 'production'
      ? 'api.loginproxy.gov.bc.ca'
      : process.env.APP_ENV === 'test'
      ? 'api.test.loginproxy.gov.bc.ca'
      : 'api.dev.loginproxy.gov.bc.ca'
  }`,
  basePath: '/api/v1',
  schemes: ['https'],
  tags: [
    {
      name: 'Integrations',
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
    {
      name: 'Users',
      description: 'Manage Users for an IDP',
    },
  ],
  components: {
    schemas: {
      // @ will ensure swagger-autogen shall not process it
      authType: {
        '@enum': ['browser-login', 'service-account', 'both'],
      },
      environment: {
        '@enum': ['dev', 'test', 'prod'],
      },
      idp: {
        '@enum': [
          'azure-idir',
          'idir',
          'bceid-basic',
          'bceid-business',
          'bceid-basic-business',
          'github-bcgov',
          'github-public',
        ],
      },
      operation: {
        '@enum': ['add', 'del'],
      },
      status: {
        '@enum': ['draft', 'submitted', 'pr', 'prFailed', 'planned', 'applied', 'applyFailed'],
      },
      integration: {
        id: 1234,
        projectName: 'integration project name',
        authType: { $ref: '#/components/schemas/authType' },
        environments: { $ref: '#/components/schemas/environment' },
        status: { $ref: '#/components/schemas/status' },
        createdAt: '2022-08-10T21:21:25.303Z',
        updatedAt: '2022-08-10T21:21:53.598Z',
      },
      roleRequest: {
        $name: 'client-role',
      },
      updatedRoleRequest: {
        $name: 'updated-client-role',
      },
      roleResponse: {
        name: 'client-role',
        composite: false,
      },
      compositeRoleRequest: {
        $name: 'composite-role',
      },
      compositeRoleResponse: {
        name: 'composite-role',
        composite: false,
      },
      userAttributes: {
        display_name: ['Test User'],
        idir_user_guid: ['AAAFEE111DD24C6D11111DFDC8BC51A1'],
        idir_username: ['TESTUSER'],
      },
      user: {
        username: '08fe81112408411081ea011cf0ec945d@idir',
        email: 'testuser@gov.bc.ca',
        firstName: 'Test',
        lastName: 'User',
        attributes: { $ref: '#/components/schemas/userAttributes' },
      },
      userRoleMappingRequest: {
        $roleName: 'client-role',
        $username: '08fe81112408411081ea011cf0ec945d@idir',
        $operation: { $ref: '#/components/schemas/operation' },
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

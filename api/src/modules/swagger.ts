import { response } from 'express';

export const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'CSS SSO API',
      description: 'CSS SSO API Service by BC Gov SSO Team',
    },
    servers: [
      {
        url: `${process.env.API_URL || 'http://localhost:8080'}/api/${process.env.API_VERSION || 'v1'}`,
      },
    ],
    contact: {
      name: 'BC Gov SSO Team',
      url: 'https://chat.developer.gov.bc.ca/channel/sso',
      email: 'bcgov.sso@gov.bc.ca',
    },
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
    paths: {
      '/integrations': {
        get: {
          tags: ['Integrations'],
          summary: 'Get list of integrations',
          description: 'Get all Gold standard integrations created by the team',
          parameters: [],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/integration',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/integration',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/integrations/{integrationId}': {
        get: {
          tags: ['Integrations'],
          summary: 'Get gold integration',
          description: 'Get a Gold standard integration by ID',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/integration',
                  },
                },
                'application/xml': {
                  schema: {
                    $ref: '#/components/schemas/integration',
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/integrations/{integrationId}/{environment}/logs': {
        get: {
          tags: ['Logs'],
          summary: 'Get logs for the integration and environment',
          description: 'Get logs for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'start',
              in: 'query',
              required: true,
              description: 'Start Datetime in ISO 8601 format, RFC 2822 format, or milliseconds since epoch.',
              example: '2024-11-14T10:00:00Z',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'end',
              in: 'query',
              required: true,
              description: 'End Datetime in ISO 8601 format, RFC 2822 format, or milliseconds since epoch.',
              example: '2024-11-14T11:00:00Z',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/logsResponse',
                  },
                },
                'application/xml': {
                  schema: {
                    $ref: '#/components/schemas/logsResponse',
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '403': {
              description: 'Forbidden',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '429': {
              description:
                'Too Many Requests. Will be rate limited after 10 requests for the same integration and environment per hour.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '500,504': {
              description: 'Server Error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/integrations/{integrationId}/{environment}/roles': {
        get: {
          tags: ['Roles'],
          summary: 'Get list of roles',
          description: 'Get roles created for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/roleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/roleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Roles'],
          summary: 'Create role',
          description: 'Create a role for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
          ],
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/roleResponse',
                  },
                },
                'application/xml': {
                  schema: {
                    $ref: '#/components/schemas/roleResponse',
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '409': {
              description: 'Conflict',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/roleRequest',
                },
              },
              'application/xml': {
                schema: {
                  $ref: '#/components/schemas/roleRequest',
                },
              },
            },
          },
        },
      },
      '/integrations/{integrationId}/{environment}/roles/{roleName}': {
        get: {
          tags: ['Roles'],
          summary: 'Get role by role name',
          description: 'Get a role created for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'roleName',
              in: 'path',
              description: 'Role name, URL encoded. Valid UTF-8 encoding required',
              required: true,
              example: 'client-role',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/roleResponse',
                  },
                },
                'application/xml': {
                  schema: {
                    $ref: '#/components/schemas/roleResponse',
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
        put: {
          tags: ['Roles'],
          summary: 'Update role',
          description: 'Update a role created for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'roleName',
              in: 'path',
              description: 'Role name, URL encoded. Valid UTF-8 encoding required',
              required: true,
              example: 'client-role',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        example: 'updated-client-role',
                      },
                      composite: {
                        type: 'boolean',
                        example: false,
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        example: 'updated-client-role',
                      },
                      composite: {
                        type: 'boolean',
                        example: false,
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '409': {
              description: 'Conflict',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/updatedRoleRequest',
                },
              },
              'application/xml': {
                schema: {
                  $ref: '#/components/schemas/updatedRoleRequest',
                },
              },
            },
          },
        },
        delete: {
          tags: ['Roles'],
          summary: 'Delete role',
          description: 'Delete a role created for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'roleName',
              in: 'path',
              description: 'Role name, URL encoded. Valid UTF-8 encoding required',
              required: true,
              example: 'client-role',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '204': {
              description: 'No Content',
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles': {
        get: {
          tags: ['Roles'],
          summary: 'Get all composites of a role',
          description: 'Get all composite roles of a role for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'roleName',
              in: 'path',
              description: 'Role name, URL encoded. Valid UTF-8 encoding required',
              required: true,
              example: 'client-role',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/compositeRoleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/compositeRoleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '409': {
              description: 'Conflict',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Roles'],
          summary: 'Add composite to role',
          description: 'Add composite roles into a role for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'roleName',
              in: 'path',
              description: 'Role name, URL encoded. Valid UTF-8 encoding required',
              required: true,
              example: 'client-role',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        example: 'client-role',
                      },
                      composite: {
                        type: 'boolean',
                        example: true,
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        example: 'client-role',
                      },
                      composite: {
                        type: 'boolean',
                        example: true,
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/compositeRoleRequest',
                  },
                },
              },
              'application/xml': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/compositeRoleRequest',
                  },
                },
              },
            },
          },
        },
      },
      '/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles/{compositeRoleName}': {
        get: {
          tags: ['Roles'],
          summary: 'Get composite of a role',
          description: 'Get a composite role from a role for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'roleName',
              in: 'path',
              description: 'Role name, URL encoded. Valid UTF-8 encoding required',
              required: true,
              example: 'client-role',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'compositeRoleName',
              in: 'path',
              description: 'Composite role name, URL encoded',
              required: true,
              example: 'composite-role',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        example: 'composite-role',
                      },
                      composite: {
                        type: 'boolean',
                        example: false,
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        example: 'composite-role',
                      },
                      composite: {
                        type: 'boolean',
                        example: false,
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '409': {
              description: 'Conflict',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
        delete: {
          tags: ['Roles'],
          summary: 'Delete composite from a role',
          description: 'Delete a composite role from a role for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'roleName',
              in: 'path',
              description: 'Role name, URL encoded. Valid UTF-8 encoding required',
              required: true,
              example: 'client-role',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'compositeRoleName',
              in: 'path',
              description: 'Composite role name, url encoded ',
              required: true,
              example: 'composite-role',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '204': {
              description: 'No Content',
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '409': {
              description: 'Conflict',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/integrations/{integrationId}/{environment}/user-role-mappings': {
        get: {
          tags: ['Role-Mapping'],
          summary: 'Get user role mappings by role name or user name',
          description:
            'Get user-role mappings by a role name or a username for the integration of the target environment <br><br> <b>Note:</b> Either roleName or username is required',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'roleName',
              in: 'query',
              description: 'Role name',
              example: 'client-role',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'username',
              in: 'query',
              description: 'Username',
              example: '08fe81112408411081ea011cf0ec945d@idir',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      users: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/user',
                        },
                      },
                      roles: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/roleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      users: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/user',
                        },
                      },
                      roles: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/roleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
          deprecated: true,
        },
        post: {
          tags: ['Role-Mapping'],
          summary: 'Create or delete user role mappings',
          description: 'Create or delete a user-role mapping for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
          ],
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      users: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/user',
                        },
                      },
                      roles: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/roleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      users: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/user',
                        },
                      },
                      roles: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/roleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '204': {
              description: 'No Content',
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/userRoleMappingRequest',
                },
              },
              'application/xml': {
                schema: {
                  $ref: '#/components/schemas/userRoleMappingRequest',
                },
              },
            },
          },
          deprecated: true,
        },
      },
      '/{environment}/idir/users': {
        get: {
          tags: ['Users'],
          summary: 'Get list of users for IDIR by query',
          description:
            'Get list of users for IDIR by query for target environment <br><br> <b>Note:</b> If exact guid is known then enter only guid and ignore firstName, lastName, and email query params',
          parameters: [
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'firstName',
              in: 'query',
              description: 'First Name',
              example: 'Julius',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'lastName',
              in: 'query',
              description: 'Last Name',
              example: 'Caesar',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'email',
              in: 'query',
              description: 'Email',
              example: 'julius.caesar@email.com',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'guid',
              in: 'query',
              description: 'Guid',
              example: 'fohe4m5pn8clhkxmlho33sn1r7vr7m67',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'fohe4m5pn8clhkxmlho33sn1r7vr7m67@idir',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                idir_user_guid: {
                                  type: 'array',
                                  example: ['fohe4m5pn8clhkxmlho33sn1r7vr7m67'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                idir_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'fohe4m5pn8clhkxmlho33sn1r7vr7m67@idir',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                idir_user_guid: {
                                  type: 'array',
                                  example: ['fohe4m5pn8clhkxmlho33sn1r7vr7m67'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                idir_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/{environment}/azure-idir/users': {
        get: {
          tags: ['Users'],
          summary: 'Get list of users for Azure IDIR by query',
          description:
            'Get list of users for Azure IDIR by query for target environment <br><br> <b>Note:</b> If exact guid is known then enter only guid and ignore firstName, lastName, and email query params',
          parameters: [
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'firstName',
              in: 'query',
              description: 'First Name',
              example: 'Julius',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'lastName',
              in: 'query',
              description: 'Last Name',
              example: 'Caesar',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'email',
              in: 'query',
              description: 'Email',
              example: 'julius.caesar@email.com',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'guid',
              in: 'query',
              description: 'Guid',
              example: 'uuz6y6mggxgfdhcqxm6kjho19krg7xle',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'uuz6y6mggxgfdhcqxm6kjho19krg7xle@azureidir',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                idir_user_guid: {
                                  type: 'array',
                                  example: ['uuz6y6mggxgfdhcqxm6kjho19krg7xle'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                idir_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'uuz6y6mggxgfdhcqxm6kjho19krg7xle@azureidir',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                idir_user_guid: {
                                  type: 'array',
                                  example: ['uuz6y6mggxgfdhcqxm6kjho19krg7xle'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                idir_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/{environment}/github-bcgov/users': {
        get: {
          tags: ['Users'],
          summary: 'Get list of users for GitHub bcgov by query',
          description:
            'Get list of users for GitHub bcgov by query for target environment <br><br> <b>Note:</b> If exact guid is known then enter only guid and ignore name, login, and email query params',
          parameters: [
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'name',
              in: 'query',
              description: 'Full Name',
              example: 'Julius Caesar',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'login',
              in: 'query',
              description: 'GitHub Login',
              example: 'juliuscaesar',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'email',
              in: 'query',
              description: 'Email',
              example: 'julius.caesar@email.com',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'guid',
              in: 'query',
              description: 'Guid',
              example: 'vbnck6ivt91hag6g1xnuvdgp0lyuebl3',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'vbnck6ivt91hag6g1xnuvdgp0lyuebl3@githubbcgov',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: '',
                            },
                            lastName: {
                              type: 'string',
                              example: '',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                github_username: {
                                  type: 'array',
                                  example: ['julius-caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                github_id: {
                                  type: 'array',
                                  example: ['12345678'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                org_verified: {
                                  type: 'array',
                                  example: ['false'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'vbnck6ivt91hag6g1xnuvdgp0lyuebl3@githubbcgov',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: '',
                            },
                            lastName: {
                              type: 'string',
                              example: '',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                github_username: {
                                  type: 'array',
                                  example: ['julius-caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                github_id: {
                                  type: 'array',
                                  example: ['12345678'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                org_verified: {
                                  type: 'array',
                                  example: ['false'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/{environment}/github-public/users': {
        get: {
          tags: ['Users'],
          summary: 'Get list of users for GitHub public by query',
          description:
            'Get list of users for GitHub public by query for target environment <br><br> <b>Note:</b> If exact guid is known then enter only guid and ignore name, login, and email query params',
          parameters: [
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'name',
              in: 'query',
              description: 'Full Name',
              example: 'Julius Caesar',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'login',
              in: 'query',
              description: 'GitHub Login',
              example: 'juliuscaesar',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'email',
              in: 'query',
              description: 'Email',
              example: 'julius.caesar@email.com',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'guid',
              in: 'query',
              description: 'Guid',
              example: 'b7valkf9208yudxfmr026wv6jhugwkht',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'b7valkf9208yudxfmr026wv6jhugwkht@githubpublic',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: '',
                            },
                            lastName: {
                              type: 'string',
                              example: '',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                github_username: {
                                  type: 'array',
                                  example: ['julius-caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                github_id: {
                                  type: 'array',
                                  example: ['12345678'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                org_verified: {
                                  type: 'array',
                                  example: ['false'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'b7valkf9208yudxfmr026wv6jhugwkht@githubpublic',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: '',
                            },
                            lastName: {
                              type: 'string',
                              example: '',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                github_username: {
                                  type: 'array',
                                  example: ['julius-caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                github_id: {
                                  type: 'array',
                                  example: ['12345678'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                org_verified: {
                                  type: 'array',
                                  example: ['false'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/{environment}/basic-bceid/users': {
        get: {
          tags: ['Users'],
          summary: 'Get list of users for Basic BCeID by query',
          description: 'Get list of users for Basic Bceid by query for target environment',
          parameters: [
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'guid',
              in: 'query',
              required: true,
              description: 'Guid',
              example: 'tb914nlltlo4mz05viha1b4hdyi4xnad',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'tb914nlltlo4mz05viha1b4hdyi4xnad@bceidbasic',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_user_guid: {
                                  type: 'array',
                                  example: ['tb914nlltlo4mz05viha1b4hdyi4xnad'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'tb914nlltlo4mz05viha1b4hdyi4xnad@bceidbasic',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_user_guid: {
                                  type: 'array',
                                  example: ['tb914nlltlo4mz05viha1b4hdyi4xnad'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
          deprecated: true,
        },
      },
      '/{environment}/business-bceid/users': {
        get: {
          tags: ['Users'],
          summary: 'Get list of users for Business BCeID by query',
          description: 'Get list of users for Business BCeID by query for target environment',
          parameters: [
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'guid',
              in: 'query',
              required: true,
              description: 'Guid',
              example: '1r1zui4qr1yfh73k6rku5q30qupgcvdt',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: '1r1zui4qr1yfh73k6rku5q30qupgcvdt@bceidbusiness',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                bceid_business_guid: {
                                  type: 'array',
                                  example: ['4t64xgki1pxqx61jxvri3i4uie1u61nk'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_business_name: {
                                  type: 'array',
                                  example: ['Julius Caesars Business Team'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_user_guid: {
                                  type: 'array',
                                  example: ['1r1zui4qr1yfh73k6rku5q30qupgcvdt'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: '1r1zui4qr1yfh73k6rku5q30qupgcvdt@bceidbusiness',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                bceid_business_guid: {
                                  type: 'array',
                                  example: ['4t64xgki1pxqx61jxvri3i4uie1u61nk'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_business_name: {
                                  type: 'array',
                                  example: ['Julius Caesars Business Team'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_user_guid: {
                                  type: 'array',
                                  example: ['1r1zui4qr1yfh73k6rku5q30qupgcvdt'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
          deprecated: true,
        },
      },
      '/{environment}/basic-business-bceid/users': {
        get: {
          tags: ['Users'],
          summary: 'Get list of users for Basic or Business BCeID by query',
          description: 'Get list of users for Basic or Business BCeID by query for target environment',
          parameters: [
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'guid',
              in: 'query',
              required: true,
              description: 'Guid',
              example: 'jj4vrfekurtzc2931k8mroqx3fgibrr3',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'jj4vrfekurtzc2931k8mroqx3fgibrr3@bceidboth',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                bceid_business_guid: {
                                  type: 'array',
                                  example: ['qplo4aqoffy2njxsaj8wwfa3qe6g3s40'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_business_name: {
                                  type: 'array',
                                  example: ['Julius Caesars Business Team'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_user_guid: {
                                  type: 'array',
                                  example: ['jj4vrfekurtzc2931k8mroqx3fgibrr3'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'jj4vrfekurtzc2931k8mroqx3fgibrr3@bceidboth',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                bceid_business_guid: {
                                  type: 'array',
                                  example: ['qplo4aqoffy2njxsaj8wwfa3qe6g3s40'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_business_name: {
                                  type: 'array',
                                  example: ['Julius Caesars Business Team'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_user_guid: {
                                  type: 'array',
                                  example: ['jj4vrfekurtzc2931k8mroqx3fgibrr3'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
          deprecated: true,
        },
      },
      '/integrations/{integrationId}/{environment}/bceid/users': {
        get: {
          tags: ['Users'],
          summary: 'Get list of BCeID users by query for an integration',
          description: 'Get list of BCeID users by query for an integration in target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'bceidType',
              in: 'query',
              required: true,
              description: 'BCeID Type',
              schema: {
                $ref: '#/components/schemas/bceidType',
              },
            },
            {
              name: 'guid',
              in: 'query',
              description: 'Guid',
              example: 'tb914nlltlo4mz05viha1b4hdyi4xnad',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'displayName',
              in: 'query',
              description: 'Display or Full name of the user',
              example: 'Julius Caesar',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'username',
              in: 'query',
              description: 'Username of the user',
              example: 'juliuscaesar',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'email',
              in: 'query',
              description: 'Email',
              example: 'julius.caesar@email.com',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'tb914nlltlo4mz05viha1b4hdyi4xnad@bceidbasic',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_user_guid: {
                                  type: 'array',
                                  example: ['tb914nlltlo4mz05viha1b4hdyi4xnad'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            username: {
                              type: 'string',
                              example: 'tb914nlltlo4mz05viha1b4hdyi4xnad@bceidbasic',
                            },
                            email: {
                              type: 'string',
                              example: 'julius-caesar@email.com',
                            },
                            firstName: {
                              type: 'string',
                              example: 'Julius',
                            },
                            lastName: {
                              type: 'string',
                              example: 'Caesar',
                            },
                            attributes: {
                              type: 'object',
                              properties: {
                                display_name: {
                                  type: 'array',
                                  example: ['Julius Caesar'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_user_guid: {
                                  type: 'array',
                                  example: ['tb914nlltlo4mz05viha1b4hdyi4xnad'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                                bceid_username: {
                                  type: 'array',
                                  example: ['JULIUSCA'],
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/integrations/{integrationId}/{environment}/users/{username}/roles': {
        get: {
          tags: ['Role-Mapping'],
          summary: 'Get roles associated with user',
          description:
            'Get roles associated with user for the integration of the target environment. For a service account, use the client ID as the username.',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'username',
              in: 'path',
              description: 'Username',
              required: true,
              example: 'jj4vrfekurtzc2931k8mroqx3fgibrr3@idir',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/roleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/roleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Role-Mapping'],
          summary: 'Assign roles to a user',
          description:
            'Assign roles to a user for the integration of the target environment. For a service account, use the client ID as the username.',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'username',
              in: 'path',
              description: 'Username',
              required: true,
              example: 'fohe4m5pn8clhkxmlho33sn1r7vr7m67@idir',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/roleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/roleResponse',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/roleRequest',
                  },
                },
              },
              'application/xml': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/roleRequest',
                  },
                },
              },
            },
          },
        },
      },
      '/integrations/{integrationId}/{environment}/roles/{roleName}/users': {
        get: {
          tags: ['Role-Mapping'],
          summary: 'Get users associated with role',
          description: 'Get users associated with role for the integration of the target environment',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'roleName',
              in: 'path',
              description: 'Role name, URL encoded. Valid UTF-8 encoding required',
              required: true,
              example: 'client-role',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page',
              default: '1',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'max',
              in: 'query',
              description: 'Max Count',
              default: '50',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      page: {
                        type: 'number',
                        example: 1,
                      },
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/user',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      page: {
                        type: 'number',
                        example: 1,
                      },
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/user',
                        },
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/integrations/{integrationId}/{environment}/users/{username}/roles/{roleName}': {
        delete: {
          tags: ['Role-Mapping'],
          summary: 'Unassign role from a user',
          description:
            'Unassign role from a user for the integration of the target environment. For a service account, use your client ID as the username.',
          parameters: [
            {
              name: 'integrationId',
              in: 'path',
              description: 'Integration Id',
              required: true,
              example: 1234,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'environment',
              in: 'path',
              description: 'Environment',
              required: true,
              schema: {
                $ref: '#/components/schemas/environment',
              },
            },
            {
              name: 'username',
              in: 'path',
              description: 'Username',
              required: true,
              example: 'fohe4m5pn8clhkxmlho33sn1r7vr7m67@idir',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'roleName',
              in: 'path',
              description: 'Role name, URL encoded. Valid UTF-8 encoding required',
              required: true,
              example: 'client-role',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '204': {
              description: 'No Content',
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Unprocessable Entity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
                'application/xml': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'string',
                      },
                    },
                    xml: {
                      name: 'main',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        authType: {
          type: 'string',
          enum: ['browser-login', 'service-account', 'both'],
          xml: {
            name: 'authType',
          },
        },
        environment: {
          type: 'string',
          enum: ['dev', 'test', 'prod'],
          xml: {
            name: 'environment',
          },
        },
        bceidType: {
          type: 'string',
          enum: ['basic', 'business', 'both'],
          xml: {
            name: 'bceidType',
          },
        },
        idp: {
          type: 'string',
          enum: [
            'azure-idir',
            'idir',
            'bceid-basic',
            'bceid-business',
            'bceid-basic-business',
            'github-bcgov',
            'github-public',
          ],
          xml: {
            name: 'idp',
          },
        },
        operation: {
          type: 'string',
          enum: ['add', 'del'],
          xml: {
            name: 'operation',
          },
        },
        status: {
          type: 'string',
          enum: ['draft', 'submitted', 'pr', 'prFailed', 'planned', 'applied', 'applyFailed'],
          xml: {
            name: 'status',
          },
        },
        integration: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              example: 1234,
            },
            projectName: {
              type: 'string',
              example: 'integration project name',
            },
            authType: {
              xml: {
                name: 'authtype',
              },
              $ref: '#/components/schemas/authType',
            },
            environments: {
              xml: {
                name: 'environment',
              },
              $ref: '#/components/schemas/environment',
            },
            status: {
              xml: {
                name: 'status',
              },
              $ref: '#/components/schemas/status',
            },
            createdAt: {
              type: 'string',
              example: '2022-08-10T21:21:25.303Z',
            },
            updatedAt: {
              type: 'string',
              example: '2022-08-10T21:21:53.598Z',
            },
          },
          xml: {
            name: 'integration',
          },
        },
        roleRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'client-role',
            },
          },
          required: ['name'],
          xml: {
            name: 'roleRequest',
          },
        },
        updatedRoleRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'updated-client-role',
            },
          },
          required: ['name'],
          xml: {
            name: 'updatedRoleRequest',
          },
        },
        roleResponse: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'client-role',
            },
            composite: {
              type: 'boolean',
              example: false,
            },
          },
          xml: {
            name: 'roleResponse',
          },
        },
        logsResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  '@timestamp': {
                    type: 'string',
                    example: 'string',
                  },
                  message: {
                    type: 'string',
                    example: 'string',
                  },
                },
              },
            },
            message: {
              type: 'string',
              example: 'string',
            },
          },
          xml: {
            name: 'logsResponse',
          },
        },
        compositeRoleRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'composite-role',
            },
          },
          required: ['name'],
          xml: {
            name: 'compositeRoleRequest',
          },
        },
        compositeRoleResponse: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'composite-role',
            },
            composite: {
              type: 'boolean',
              example: false,
            },
          },
          xml: {
            name: 'compositeRoleResponse',
          },
        },
        userAttributes: {
          type: 'object',
          properties: {
            display_name: {
              type: 'array',
              example: ['Test User'],
              items: {
                type: 'string',
              },
            },
            idir_user_guid: {
              type: 'array',
              example: ['AAAFEE111DD24C6D11111DFDC8BC51A1'],
              items: {
                type: 'string',
              },
            },
            idir_username: {
              type: 'array',
              example: ['TESTUSER'],
              items: {
                type: 'string',
              },
            },
          },
          xml: {
            name: 'userAttributes',
          },
        },
        user: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              example: '08fe81112408411081ea011cf0ec945d@idir',
            },
            email: {
              type: 'string',
              example: 'testuser@gov.bc.ca',
            },
            firstName: {
              type: 'string',
              example: 'Test',
            },
            lastName: {
              type: 'string',
              example: 'User',
            },
            attributes: {
              xml: {
                name: 'userattributes',
              },
              $ref: '#/components/schemas/userAttributes',
            },
          },
          xml: {
            name: 'user',
          },
        },
        userRoleMappingRequest: {
          type: 'object',
          properties: {
            roleName: {
              type: 'string',
              example: 'client-role',
            },
            username: {
              type: 'string',
              example: '08fe81112408411081ea011cf0ec945d@idir',
            },
            operation: {
              xml: {
                name: 'operation',
              },
              $ref: '#/components/schemas/operation',
            },
          },
          required: ['roleName', 'username', 'operation'],
          xml: {
            name: 'userRoleMappingRequest',
          },
        },
      },
      securitySchemes: {
        oAuth2ClientCredentials: {
          type: 'oauth2',
          description: 'See http://developers.gettyimages.com/api/docs/v3/oauth2.html',
          flows: {
            clientCredentials: {
              tokenUrl: `${process.env.API_URL || 'http://localhost:8080'}/api/v1/token`,
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
  },
  apis: ['../routes.ts'],
};

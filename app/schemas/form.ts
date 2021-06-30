import { JSONSchema7 } from 'json-schema';

export default {
  title: 'Make a Request',
  type: 'object',
  required: ['projectName'],
  properties: {
    projectName: { type: 'string', title: 'Project Name' },
    identityProviders: {
      type: 'object',
      title: 'Identity Providers',
      properties: {
        github: { type: 'boolean', title: 'Github', default: true },
        idir: { type: 'boolean', title: 'IDIR', default: true },
      },
    },
    dev: { type: 'boolean', title: 'Dev' },
    test: { type: 'boolean', title: 'Test' },
    prod: { type: 'boolean', title: 'Prod' },
  },

  dependencies: {
    dev: {
      oneOf: [
        {
          properties: {
            dev: { enum: [true] },
            devRedirectUrls: {
              type: 'array',
              items: { type: 'object', properties: { url: { type: 'string', format: 'uri' } } },
            },
          },
          required: ['devRedirectUrls'],
        },
      ],
    },
    test: {
      oneOf: [
        {
          properties: {
            test: { enum: [true] },
            testRedirectUrls: {
              type: 'array',
              items: { type: 'object', properties: { url: { type: 'string', format: 'uri' } } },
            },
          },
          required: ['testRedirectUrls'],
        },
      ],
    },
    prod: {
      oneOf: [
        {
          properties: {
            prod: { enum: [true] },
            prodRedirectUrls: {
              type: 'array',
              items: { type: 'object', properties: { url: { type: 'string', format: 'uri' } } },
            },
          },
          required: ['prodRedirectUrls'],
        },
      ],
    },
  },
} as JSONSchema7;

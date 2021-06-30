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
    environments: {
      type: 'object',
      title: 'Environments',
      properties: {
        dev: { type: 'boolean', title: 'Dev', default: false },
        test: { type: 'boolean', title: 'Test', default: false },
        prod: { type: 'boolean', title: 'Prod', default: false },
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
            {
              properties: {
                dev: { enum: [false] },
              },
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
            {
              properties: {
                test: { enum: [false] },
              },
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
            {
              properties: {
                prod: { enum: [false] },
              },
            },
          ],
        },
      },
    },
  },
} as JSONSchema7;

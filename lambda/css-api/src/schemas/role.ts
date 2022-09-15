import validator from '../ajv-validator';

export const ROLE_REQ = {
  type: 'object',
  properties: {
    name: { type: 'string' },
  },
  additionalProperties: false,
  required: ['name'],
  errorMessage: 'invalid role',
};

export const validate = validator.compile(ROLE_REQ);

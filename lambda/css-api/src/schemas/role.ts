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

export const LIST_OF_ROLES_REQ = {
  type: 'array',
  items: ROLE_REQ,
  additionalProperties: false,
  minItems: 1,
  errorMessage: 'invalid list of roles',
};

export const roleValidator = validator.compile(ROLE_REQ);

export const listOfrolesValidator = validator.compile(LIST_OF_ROLES_REQ);

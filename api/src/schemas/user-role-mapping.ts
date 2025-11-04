import validator from '@/modules/ajv-validator';

const GET_USER_ROLE_MAPPING_REQ = {
  type: 'object',
  properties: {
    roleName: { type: 'string' },
    username: { type: 'string' },
  },
  additionalProperties: false,
  anyOf: [
    {
      required: ['roleName'],
      errorMessage: {
        required: {
          roleName: 'roleName is required',
        },
      },
    },
    {
      required: ['username'],
      errorMessage: {
        required: {
          username: 'username is required',
        },
      },
    },
  ],
  errorMessage: {
    additionalProperties: 'only roleName and username are supported',
  },
};

const POST_USER_ROLE_MAPPING_REQ = {
  type: 'object',
  properties: {
    roleName: { type: 'string' },
    username: { type: 'string' },
    operation: { type: 'string' },
  },
  additionalProperties: false,
  required: ['roleName', 'username', 'operation'],
  errorMessage: 'invalid user-role-mapping',
};

const GET_USERS_BY_ROLE_NAME_REQ = {
  type: 'object',
  properties: {
    page: { type: 'number', minimum: 1, errorMessage: 'page should be a number greater than 0' },
    max: { type: 'number', minimum: 1, maximum: 50, errorMessage: 'max count should be a number within range 1 - 50' },
  },
  additionalProperties: false,
  errorMessage: {
    additionalProperties: 'only page and max are supported',
  },
};

export const getValidator = validator.compile(GET_USER_ROLE_MAPPING_REQ);

export const postValidator = validator.compile(POST_USER_ROLE_MAPPING_REQ);

export const getUsersByRolenameValidator = validator.compile(GET_USERS_BY_ROLE_NAME_REQ);

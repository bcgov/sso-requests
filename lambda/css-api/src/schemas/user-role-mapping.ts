import validator from '../ajv-validator';

const GET_USER_ROLE_MAPPING_REQ = {
  type: 'object',
  properties: {
    roleName: { type: 'string' },
    username: { type: 'string' },
  },
  additionalProperties: false,
  anyOf: [{ required: ['roleName'] }, { required: ['username'] }],
  errorMessage: 'either roleName or username is required',
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

export const getValidator = validator.compile(GET_USER_ROLE_MAPPING_REQ);

export const postValidator = validator.compile(POST_USER_ROLE_MAPPING_REQ);

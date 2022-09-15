import validator from '../ajv-validator';

export const USER_ROLE_MAPPING_REQ = {
  type: 'object',
  properties: {
    roleName: { type: 'string' },
    username: { type: 'string' },
  },
  additionalProperties: false,
  anyOf: [{ required: ['roleName'] }, { required: ['username'] }],
  errorMessage: 'either roleName or username is required',
};

export const validate = validator.compile(USER_ROLE_MAPPING_REQ);

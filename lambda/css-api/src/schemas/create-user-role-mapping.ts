import validator from '../ajv-validator';

export const USER_ROLE_MAPPING_REQ = {
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

export const validate = validator.compile(USER_ROLE_MAPPING_REQ);

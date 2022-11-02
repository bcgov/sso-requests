import validator from '../ajv-validator';

const COMMON_USER_QUERY_REQ = {
  type: 'object',
  properties: {
    firstName: {
      type: 'string',
      minLength: 2,
      errorMessage: {
        _: 'firstName should be string with length >= 2',
      },
    },
    lastName: {
      type: 'string',
      minLength: 2,
      errorMessage: {
        _: 'lastName should be string with length >= 2',
      },
    },
    email: {
      type: 'string',
      minLength: 2,
      errorMessage: {
        _: 'email should be string with length >= 2',
      },
    },
    guid: {
      type: 'string',
      minLength: 2,
      errorMessage: {
        _: 'guid should be string with length >= 2',
      },
    },
  },
  additionalProperties: false,
  anyOf: [
    {
      required: ['firstName'],
      errorMessage: {
        required: {
          firstName: 'firstName is required',
        },
      },
    },
    {
      required: ['lastName'],
      errorMessage: {
        required: {
          lastName: 'lastName is required',
        },
        minLength: 'lastName should be string with length >= 2',
      },
    },
    {
      required: ['email'],
      errorMessage: {
        required: {
          email: 'email is required',
        },
        minLength: 'email should be string with length >= 2',
      },
    },
    {
      required: ['guid'],
      errorMessage: {
        required: {
          guid: 'guid is required',
        },
      },
    },
  ],
  errorMessage: {
    additionalProperties: 'only firstName, lastName, email and guid are supported',
  },
};

const GITHUB_USER_QUERY_REQ = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 2,
      errorMessage: {
        _: 'name should be string with length >= 2',
      },
    },
    loginid: {
      type: 'string',
      minLength: 2,
      errorMessage: {
        _: 'login id should be string with length >= 2',
      },
    },
    email: {
      type: 'string',
      minLength: 2,
      errorMessage: {
        _: 'email should be string with length >= 2',
      },
    },
    guid: {
      type: 'string',
      minLength: 2,
      errorMessage: {
        _: 'guid should be string with length >= 2',
      },
    },
  },
  additionalProperties: false,
  anyOf: [
    {
      required: ['name'],
      errorMessage: {
        required: {
          name: 'name is required',
        },
      },
    },
    {
      required: ['loginid'],
      errorMessage: {
        required: {
          loginid: 'loginid is required',
        },
        minLength: 'loginid should be string with length >= 2',
      },
    },
    {
      required: ['email'],
      errorMessage: {
        required: {
          email: 'email is required',
        },
        minLength: 'email should be string with length >= 2',
      },
    },
    {
      required: ['guid'],
      errorMessage: {
        required: {
          guid: 'guid is required',
        },
      },
    },
  ],
  errorMessage: {
    additionalProperties: 'only name, loginid, email and guid are supported',
  },
};

const BCEID_USER_QUERY_REQ = {
  type: 'object',
  properties: {
    guid: {
      type: 'string',
      minLength: 2,
      errorMessage: {
        _: 'guid should be string with length >= 2',
      },
    },
  },
  additionalProperties: false,
  required: ['guid'],
  errorMessage: {
    required: {
      guid: 'guid is required',
    },
    additionalProperties: 'only guid is supported',
  },
};

export const findCommonUserQueryValidator = validator.compile(COMMON_USER_QUERY_REQ);

export const findGithubUserQueryValidator = validator.compile(GITHUB_USER_QUERY_REQ);

export const findBceidUserQueryValidator = validator.compile(BCEID_USER_QUERY_REQ);

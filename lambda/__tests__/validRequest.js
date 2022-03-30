const validRequest = {
  realm: 'onestopauth',
  projectName: 'test',
  projectLead: true,
  devValidRedirectUris: ['https://a'],
  testValidRedirectUris: ['https://a'],
  prodValidRedirectUris: ['https://a'],
  agreeWithTerms: true,
  publicAccess: true,
  environments: ['dev', 'test', 'prod'],
  usesTeam: false,
};

const invalidRequest = {
  ...validRequest,
  agreeWithTerms: false,
};

const bceidRequest = {
  ...validRequest,
  realm: 'onestopauth-basic',
};

module.exports = { validRequest, invalidRequest, bceidRequest };

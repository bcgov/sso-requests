const validRequest = {
  realm: 'onestopauth',
  projectName: 'test',
  preferredEmail: 'a@b.com',
  projectLead: true,
  devValidRedirectUris: ['https://a'],
  testValidRedirectUris: ['https://a'],
  prodValidRedirectUris: ['https://a'],
  agreeWithTerms: true,
  publicAccess: true,
  dev: true,
  test: true,
  prod: true,
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

const validRequest = {
  realm: 'onestopauth',
  projectName: 'test',
  preferredEmail: 'a@b.com',
  projectLead: true,
  devValidRedirectUris: ['http://a'],
  testValidRedirectUris: ['http://a'],
  prodValidRedirectUris: ['http://a'],
  agreeWithTerms: true,
  publicAccess: true,
  dev: true,
  test: true,
  prod: true,
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

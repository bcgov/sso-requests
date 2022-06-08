import { Request } from 'interfaces/Request';

export const sampleRequest: Request = {
  id: 0,
  devValidRedirectUris: ['http://dev1.com', 'http://dev2.com'],
  testValidRedirectUris: ['http://test.com'],
  prodValidRedirectUris: ['http://prod.com'],
  publicAccess: true,
  realm: 'onestopauth',
  projectName: 'test project',
  projectLead: true,
  agreeWithTerms: true,
  environments: ['dev'],
  archived: false,
  usesTeam: false,
  serviceType: 'silver',
};

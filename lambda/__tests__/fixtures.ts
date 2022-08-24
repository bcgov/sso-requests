import { IntegrationData } from '../shared/interfaces';

export const formDataDev: IntegrationData = {
  id: 1,
  idirUserId: 'TEST',
  projectName: 'test',
  clientId: 'test',
  realm: 'onestopauth',
  publicAccess: true,
  devValidRedirectUris: ['https://b'],
  environments: ['dev'],
  projectLead: true,
  newToSso: true,
  agreeWithTerms: true,
  status: 'draft',
  archived: false,
  idirUserDisplayName: 'test user',
  usesTeam: false,
  requester: 'SSO Admin',
  user: {
    id: 0,
    idirUserid: 'QWERASDF',
    idirEmail: 'test@test.com',
    displayName: 'Test User',
    additionalEmail: '',
  },
};

export const formDataProd: IntegrationData = {
  ...formDataDev,
  testValidRedirectUris: ['https://a'],
  prodValidRedirectUris: ['https://a'],
  environments: ['dev', 'test', 'prod'],
};

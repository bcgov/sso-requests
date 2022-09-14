import { IntegrationData } from '../shared/interfaces';

export const formDataDev: IntegrationData = {
  id: 1,
  idirUserid: 'TEST',
  projectName: 'test',
  clientId: 'test',
  serviceType: 'gold',
  publicAccess: true,
  devValidRedirectUris: ['https://b'],
  environments: ['dev'],
  devIdps: ['idir'],
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

export const formDataDevTest: IntegrationData = {
  ...formDataDev,
  testValidRedirectUris: ['https://test'],
  environments: ['dev', 'test'],
};

export const formDataProd: IntegrationData = {
  ...formDataDevTest,
  prodValidRedirectUris: ['https://a'],
  environments: ['dev', 'test', 'prod'],
};

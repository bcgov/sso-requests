import { Data } from '../shared/interfaces';

export const formDataDev: Data = {
  id: 1,
  idirUserId: 'TEST',
  projectName: 'test',
  clientName: 'test',
  realm: 'onestopauth',
  publicAccess: true,
  devValidRedirectUris: ['https://b'],
  environments: ['dev'],
  projectLead: false,
  preferredEmail: 'test',
  newToSso: true,
  agreeWithTerms: true,
  status: 'draft',
  archived: false,
  additionalEmails: [],
  idirUserDisplayName: 'test user',
};

export const formDataProd: Data = {
  ...formDataDev,
  testValidRedirectUris: ['https://a'],
  prodValidRedirectUris: ['https://a'],
  environments: ['dev', 'test', 'prod'],
};

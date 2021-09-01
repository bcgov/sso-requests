import { getDifferences } from '../utils/helpers';

const formDataUpdated: any = {
  id: 1,
  idirUserid: 'TEST',
  projectName: 'test',
  clientName: 'test',
  realm: 'onestopauth',
  publicAccess: true,
  devValidRedirectUris: ['https://b'],
  testValidRedirectUris: ['https://a'],
  prodValidRedirectUris: ['https://a'],
  environments: ['dev', 'test', 'prod'],
  prNumber: 10,
  actionNumber: 10,
  createdAt: 'test',
  updatedAt: '10-11-2012',
  projectLead: false,
  preferredEmail: 'test',
  newToSso: true,
  agreeWithTerms: true,
  status: 'draft',
  archived: false,
};

const formDataOriginal: any = {
  id: 1,
  idirUserid: 'TEST',
  projectName: 'test',
  clientName: 'test',
  realm: 'onestopauth',
  publicAccess: true,
  devValidRedirectUris: ['https://a'],
  testValidRedirectUris: ['https://a'],
  prodValidRedirectUris: ['https://a'],
  environments: ['dev', 'test', 'prod'],
  prNumber: 10,
  actionNumber: 10,
  createdAt: 'test',
  updatedAt: '11-12-2013',
  projectLead: false,
  preferredEmail: 'test',
  newToSso: true,
  agreeWithTerms: true,
  status: 'draft',
  archived: false,
};

const expectedDiff = [{ kind: 'E', lhs: 'https://a', path: ['devValidRedirectUris', 0], rhs: 'https://b' }];

it('should display the differences', () => {
  expect(getDifferences(formDataOriginal, formDataUpdated)).toEqual(expectedDiff);
});

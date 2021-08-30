import { validateRequest } from '../utils/helpers';

const formDataUpdated: any = {
  id: 1,
  idirUserid: 'TEST',
  projectName: 'test',
  clientName: 'test',
  realm: 'onestopauth',
  publicAccess: true,
  devValidRedirectUris: ['http://b'],
  testValidRedirectUris: ['http://a'],
  prodValidRedirectUris: ['http://a'],
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
  devValidRedirectUris: ['http://a'],
  testValidRedirectUris: ['http://a'],
  prodValidRedirectUris: ['http://a'],
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

it('should respond valid if there are valid changes', () => {
  expect(validateRequest(formDataOriginal, formDataUpdated)).toBe(true);
});

it('should respond invalid if there are no changes', () => {
  const originalWithSameValues = { ...formDataOriginal, devValidRedirectUris: ['http://b'] };
  expect(validateRequest(originalWithSameValues, formDataUpdated)).toEqual({ error: 'No changes submitted' });
});

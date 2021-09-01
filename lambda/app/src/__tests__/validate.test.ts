import { validateRequest, errorMessage } from '../utils/helpers';

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

const formDataWithMutatedNonFormFields: any = {
  id: 1,
  idirUserid: 'TEST',
  projectName: 'test',
  clientName: 'test-two',
  realm: 'onestopauth',
  publicAccess: true,
  devValidRedirectUris: ['https://a'],
  testValidRedirectUris: ['https://a'],
  prodValidRedirectUris: ['https://a'],
  environments: ['dev', 'test', 'prod'],
  prNumber: 15,
  actionNumber: 15,
  createdAt: 'test2',
  updatedAt: '11-12-2015',
  projectLead: false,
  preferredEmail: 'test',
  newToSso: true,
  agreeWithTerms: true,
  status: 'submitted',
  archived: true,
};

it('should respond valid if there are valid changes', () => {
  expect(validateRequest(formDataOriginal, formDataUpdated, true)).toBe(true);
});

it('should respond invalid if there are no changes', () => {
  const originalWithSameValues = { ...formDataOriginal, devValidRedirectUris: ['https://b'] };
  expect(validateRequest(formDataOriginal, formDataWithMutatedNonFormFields, true)).toEqual({ message: errorMessage });
  expect(validateRequest(originalWithSameValues, formDataUpdated, true)).toEqual({ message: errorMessage });
});

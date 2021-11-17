import { processRequest } from '../utils/helpers';

const data: any = {
  id: 1,
  idirUserid: 'TEST',
  projectName: 'test',
  clientName: 'test-two',
  realm: 'onestopauth',
  publicAccess: true,
  devValidRedirectUris: ['https://a', 'https://c', 'https://b'],
  testValidRedirectUris: ['https://a', 'https://c', 'https://b'],
  prodValidRedirectUris: ['https://a', 'https://c', 'https://b'],
  dev: true,
  test: true,
  prod: false,
  prNumber: 15,
  actionNumber: 15,
  createdAt: 'test2',
  updatedAt: '11-12-2015',
  projectLead: false,
  preferredEmail: 'test',
  agreeWithTerms: true,
  status: 'submitted',
  archived: true,
};

it('should order the URIs', () => {
  const processedData = processRequest(data);
  expect(processedData.devValidRedirectUris).toEqual(['https://a', 'https://b', 'https://c']);
  expect(processedData.testValidRedirectUris).toEqual(['https://a', 'https://b', 'https://c']);
  expect(processedData.prodValidRedirectUris).toEqual(['https://a', 'https://b', 'https://c']);
});

it('should process the environments', () => {
  const processedData = processRequest(data);
  expect(processedData.environments).toEqual(['dev', 'test']);

  const allEnvs = { ...data, prod: true };
  expect(processRequest(allEnvs).environments).toEqual(['dev', 'test', 'prod']);
});

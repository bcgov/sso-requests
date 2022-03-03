import { processRequest } from '../utils/helpers';

const data: any = {
  id: 1,
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
  projectLead: true,
  agreeWithTerms: true,
  status: 'submitted',
  archived: true,
};

it('should order the URIs', () => {
  const processedData = processRequest(data, false);
  expect(processedData.devValidRedirectUris).toEqual(['https://a', 'https://b', 'https://c']);
  expect(processedData.testValidRedirectUris).toEqual(['https://a', 'https://b', 'https://c']);
  expect(processedData.prodValidRedirectUris).toEqual(['https://a', 'https://b', 'https://c']);
});

it('should process the environments', () => {
  const processedData = processRequest(data, false);
  expect(processedData.environments).toEqual(['dev', 'test']);

  const allEnvs = { ...data, prod: true };
  expect(processRequest(allEnvs, false).environments).toEqual(['dev', 'test', 'prod']);
});

it('should omit the realm for merged requests', () => {
  const processedData = processRequest(data, true);
  expect(processedData.realm).toBeUndefined();
});

import { formatFormData } from '../helpers';

const url = 'http://example.com';
const firstPageData = {
  projectName: 'test',
  projectLead: true,
  preferredEmail: 'jon@test.com',
  newToSso: true,
};

const expectedFirstPageData = {
  environments: [],
  projectName: 'test',
  projectLead: true,
  preferredEmail: 'jon@test.com',
  newToSso: true,
  validRedirectUrls: {
    dev: [],
    test: [],
    prod: [],
  },
};

const expectedFullData = {
  ...expectedFirstPageData,
  environments: ['dev', 'test', 'prod'],
  realm: 'onestopauth',
  validRedirectUrls: {
    dev: [url],
    test: [url],
    prod: [url],
  },
};

const fullTestData = {
  ...firstPageData,
  realm: 'onestopauth',
  devRedirectUrls: [url],
  testRedirectUrls: [url],
  prodRedirectUrls: [url],
};

describe('format form data', () => {
  it('formats the first page data correctly', () => {
    expect(formatFormData(firstPageData)).toEqual(expectedFirstPageData);
  });
  it('formats full data correctly', () => {
    expect(formatFormData(fullTestData)).toEqual(expectedFullData);
  });
});

import { formatFormData } from '../helpers';

const firstPageData = {
  projectName: 'test',
  projectLead: true,
  preferredEmail: 'jon@test.com',
  newToSSO: true,
};

const expectedFirstPageData = {
  projectName: 'test',
  projectLead: true,
  preferredEmail: 'jon@test.com',
  newToSSO: true,
  environments: [],
  identityProviders: [],
  validRedirectUrls: {
    dev: [],
    test: [],
    prod: [],
  },
};

const expectedFullData = {
  ...expectedFirstPageData,
  environments: ['dev'],
  validRedirectUrls: {
    dev: ['http://example.com'],
    prod: [],
    test: [],
  },
};

const fullTestData = {
  ...firstPageData,
  environments: {
    dev: true,
    devRedirectUrls: [
      {
        url: 'http://example.com',
      },
    ],
  },
};

describe('format form data', () => {
  it('formats the first page data correctly', () => {
    expect(formatFormData(firstPageData)).toEqual(expectedFirstPageData);
  });
  it('formats full data correctly', () => {
    expect(formatFormData(fullTestData)).toEqual(expectedFullData);
  });
});

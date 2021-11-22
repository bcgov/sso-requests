import { formatFilters } from 'utils/helpers';

const allIdpOptions = [
  { value: ['onestopauth'], label: 'IDIR' },
  { value: ['onestopauth-basic', 'onestopauth-business', 'onestopauth-both'], label: 'BCeID' },
];

const allEnvironmentOptions = [
  { value: 'dev', label: 'Dev' },
  { value: 'test', label: 'Test' },
  { value: 'prod', label: 'Prod' },
];

describe('Format filters', () => {
  it('Should return the expected format', () => {
    const [realms, environments] = formatFilters(allIdpOptions, allEnvironmentOptions);
    expect(realms).toEqual(['onestopauth', 'onestopauth-basic', 'onestopauth-business', 'onestopauth-both']);
    expect(environments).toEqual(['dev', 'test', 'prod']);

    const [filteredRealms, filteredEnvironments] = formatFilters([allIdpOptions[0]], [allEnvironmentOptions[0]]);

    expect(filteredRealms).toEqual(['onestopauth']);
    expect(filteredEnvironments).toEqual(['dev']);
  });

  it('Should convert empty array to null', () => {
    const [realms, environments] = formatFilters([], []);
    expect(realms).toBe(null);
    expect(environments).toBe(null);
  });
});

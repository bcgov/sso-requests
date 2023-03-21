import { formatFilters } from 'utils/helpers';

const allIdpOptions = [
  { value: 'idir', label: 'IDIR' },
  {
    value: 'bceid',
    label: 'BCeID',
  },
  { value: 'github', label: 'GitHub' },
];

const allEnvironmentOptions = [
  { value: 'dev', label: 'Dev' },
  { value: 'test', label: 'Test' },
  { value: 'prod', label: 'Prod' },
];

describe('Format filters', () => {
  it('Should return the expected format', () => {
    const [devIdps, realms, environments] = formatFilters(allIdpOptions, allEnvironmentOptions);
    expect(devIdps).toEqual([
      'idir',
      'azureidir',
      'bceidbasic',
      'bceidbusiness',
      'bceidboth',
      'githubbcgov',
      'githubpublic',
    ]);
    expect(realms).toEqual(['onestopauth', 'onestopauth-basic', 'onestopauth-business', 'onestopauth-both']);
    expect(environments).toEqual(['dev', 'test', 'prod']);

    const [filteredDevIdps, filteredRealms, filteredEnvironments] = formatFilters(
      [allIdpOptions[0]],
      [allEnvironmentOptions[0]],
    );

    expect(filteredRealms).toEqual(['onestopauth']);
    expect(filteredDevIdps).toEqual(['idir', 'azureidir']);
    expect(filteredEnvironments).toEqual(['dev']);
  });

  it('Should convert empty array to null', () => {
    const [realms, environments] = formatFilters([], []);
    expect(realms).toBe(null);
    expect(environments).toBe(null);
  });
});

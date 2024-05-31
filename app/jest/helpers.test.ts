import { getRequestedEnvironments, canDeleteMember } from 'utils/helpers';
import { isValidKeycloakURIDev, isValidKeycloakURIProd } from 'utils/validate';

describe('kecloak URIs', () => {
  it('should validate the URI correctly', () => {
    expect(isValidKeycloakURIDev('*')).toBe(false);
    expect(isValidKeycloakURIDev('*:')).toBe(false);
    expect(isValidKeycloakURIDev(':/')).toBe(false);
    expect(isValidKeycloakURIDev('//')).toBe(false);
    expect(isValidKeycloakURIDev('example:')).toBe(true);
    expect(isValidKeycloakURIDev('example:*')).toBe(true);
    expect(isValidKeycloakURIDev('example://*')).toBe(true);
    expect(isValidKeycloakURIProd('*')).toBe(false);

    expect(isValidKeycloakURIProd('http://a')).toBe(true);
    expect(isValidKeycloakURIProd('https://a')).toBe(true);
    expect(isValidKeycloakURIProd('custom://a')).toBe(true);
    expect(isValidKeycloakURIProd('custom://')).toBe(false);
    expect(isValidKeycloakURIProd('https://')).toBe(false);
    expect(isValidKeycloakURIProd('http://')).toBe(false);
    expect(isValidKeycloakURIProd('http:/')).toBe(false);
    expect(isValidKeycloakURIProd(' http:/')).toBe(false);
    expect(isValidKeycloakURIProd('http://a ')).toBe(false);
    expect(isValidKeycloakURIProd('http://a b')).toBe(false);
    expect(isValidKeycloakURIProd('http://a#b')).toBe(false);
    expect(isValidKeycloakURIProd('http://ab#')).toBe(false);

    expect(isValidKeycloakURIProd('a://b')).toBe(true);
    expect(isValidKeycloakURIProd('://b')).toBe(false);
    expect(isValidKeycloakURIProd('//b')).toBe(false);

    expect(isValidKeycloakURIProd('a-b://c')).toBe(true);
    expect(isValidKeycloakURIProd('ab-://c')).toBe(true);
    expect(isValidKeycloakURIProd('a-b-://c')).toBe(true);
    expect(isValidKeycloakURIProd('-ab://c')).toBe(false);

    expect(isValidKeycloakURIProd('a.b://c')).toBe(true);
    expect(isValidKeycloakURIProd('ab.://c')).toBe(true);
    expect(isValidKeycloakURIProd('a.b.://c')).toBe(true);
    expect(isValidKeycloakURIProd('.ab://c')).toBe(false);

    expect(isValidKeycloakURIProd('https://example.com/apple')).toBe(true);
    expect(isValidKeycloakURIProd('https://example.com/*')).toBe(true);
    expect(isValidKeycloakURIProd('https://example*')).toBe(false);
    expect(isValidKeycloakURIProd('https://example.com*')).toBe(false);
    expect(isValidKeycloakURIProd('https://exam***ple.com*')).toBe(false);
  });
});

describe('Get Requested Environments', () => {
  it('returns the expected environments for idir', () => {
    expect(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['dev'],
      }).map((v) => v.name),
    ).toEqual(['dev']);

    expect(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['test'],
      }).map((v) => v.name),
    ).toEqual(['test']);

    expect(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['dev', 'test'],
      }).map((v) => v.name),
    ).toEqual(['dev', 'test']);

    expect(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['dev', 'test', 'prod'],
      }).map((v) => v.name),
    ).toEqual(['dev', 'test', 'prod']);
  });

  it('returns the expected environments for bceid', () => {
    expect(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['dev'],
      }).map((v) => v.name),
    ).toEqual(['dev']);

    expect(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['test'],
      }).map((v) => v.name),
    ).toEqual(['test']);

    expect(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['dev', 'test'],
      }).map((v) => v.name),
    ).toEqual(['dev', 'test']);

    console.log(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['dev', 'test', 'prod'],
        bceidApproved: false,
      }),
    );

    expect(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['dev', 'test', 'prod'],
        bceidApproved: false,
      }).map((v) => v.name),
    ).toEqual(['dev', 'test', 'prod']);

    console.log(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['dev', 'test', 'prod'],
        bceidApproved: true,
      }),
    );

    expect(
      getRequestedEnvironments({
        realm: 'standard',
        environments: ['dev', 'test', 'prod'],
        bceidApproved: true,
      }).map((v) => v.name),
    ).toEqual(['dev', 'test', 'prod']);
  });
});

describe('Can Delete Member', () => {
  it('Should return false if the user is the last admin', () => {
    expect(
      canDeleteMember(
        [
          {
            role: 'admin',
            id: 1,
            idirEmail: '',
          },
          {
            role: 'member',
            id: 2,
            idirEmail: '',
          },
        ],
        1,
      ),
    ).toBe(false);
  });
  it('Should return true if the user is not an admin', () => {
    expect(
      canDeleteMember(
        [
          {
            role: 'admin',
            id: 1,
            idirEmail: '',
          },
          {
            role: 'member',
            id: 2,
            idirEmail: '',
          },
        ],
        2,
      ),
    ).toBe(true);
  });
});

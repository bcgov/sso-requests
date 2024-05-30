import { getRequestedEnvironments, canDeleteMember } from 'utils/helpers';
import { isValidKeycloakURI } from 'utils/validate';

describe('kecloak URIs', () => {
  it('should validate the URI correctly', () => {
    expect(isValidKeycloakURI('*')).toBe(false);

    expect(isValidKeycloakURI('http://a')).toBe(true);
    expect(isValidKeycloakURI('https://a')).toBe(true);
    expect(isValidKeycloakURI('custom://a')).toBe(true);
    expect(isValidKeycloakURI('custom://')).toBe(false);
    expect(isValidKeycloakURI('https://')).toBe(false);
    expect(isValidKeycloakURI('http://')).toBe(false);
    expect(isValidKeycloakURI('http:/')).toBe(false);
    expect(isValidKeycloakURI(' http:/')).toBe(false);
    expect(isValidKeycloakURI('http://a ')).toBe(false);
    expect(isValidKeycloakURI('http://a b')).toBe(false);
    expect(isValidKeycloakURI('http://a#b')).toBe(false);
    expect(isValidKeycloakURI('http://ab#')).toBe(false);

    expect(isValidKeycloakURI('a://b')).toBe(true);
    expect(isValidKeycloakURI('://b')).toBe(false);
    expect(isValidKeycloakURI('//b')).toBe(false);

    expect(isValidKeycloakURI('a-b://c')).toBe(true);
    expect(isValidKeycloakURI('ab-://c')).toBe(true);
    expect(isValidKeycloakURI('a-b-://c')).toBe(true);
    expect(isValidKeycloakURI('-ab://c')).toBe(false);

    expect(isValidKeycloakURI('a.b://c')).toBe(true);
    expect(isValidKeycloakURI('ab.://c')).toBe(true);
    expect(isValidKeycloakURI('a.b.://c')).toBe(true);
    expect(isValidKeycloakURI('.ab://c')).toBe(false);

    expect(isValidKeycloakURI('https://example.com/apple')).toBe(true);
    expect(isValidKeycloakURI('https://example.com/*')).toBe(true);
    expect(isValidKeycloakURI('https://example*')).toBe(false);
    expect(isValidKeycloakURI('https://example.com*')).toBe(false);
    expect(isValidKeycloakURI('https://exam***ple.com*')).toBe(false);
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

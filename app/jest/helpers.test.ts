import { getRequestedEnvironments, canDeleteMember } from 'utils/helpers';
import { isValidKeycloakURIDev, isValidKeycloakURIProd } from 'utils/validate';

describe('kecloak URIs', () => {
  it('should validate the URI correctly', () => {
    expect(isValidKeycloakURIDev('*')).toBe(true);
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

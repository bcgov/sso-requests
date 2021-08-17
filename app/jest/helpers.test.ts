import { realmToIDP, idpToRealm } from 'utils/helpers';
import { isValidKeycloakURI } from 'utils/shared/customValidate';

describe('idp to realm', () => {
  it('gives the correct realm for different orders', () => {
    expect(idpToRealm(['idir'])).toEqual('onestopauth');
    expect(idpToRealm(['idir'])).toEqual('onestopauth');
  });
  it('works for all realms', () => {
    expect(idpToRealm(['idir', 'bceid-basic'])).toEqual('onestopauth-basic');
    expect(idpToRealm(['idir', 'bceid-business'])).toEqual('onestopauth-business');
    expect(idpToRealm(['idir', 'bceid-business', 'bceid-basic'])).toEqual('onestopauth-both');
  });
});

describe('kecloak URIs', () => {
  it('should validate the URI correctly', () => {
    expect(isValidKeycloakURI('http://a')).toBe(true);
    expect(isValidKeycloakURI('https://a')).toBe(true);
    expect(isValidKeycloakURI('shttps://a')).toBe(false);
    expect(isValidKeycloakURI('htttps://a')).toBe(false);
    expect(isValidKeycloakURI('https://')).toBe(false);
    expect(isValidKeycloakURI('http://')).toBe(false);
    expect(isValidKeycloakURI('http:/')).toBe(false);
    expect(isValidKeycloakURI(' http:/')).toBe(false);
    expect(isValidKeycloakURI('http://a ')).toBe(false);
    expect(isValidKeycloakURI('http://a b')).toBe(false);
  });
});

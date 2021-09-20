import { realmToIDP, idpToRealm, formatChangeEventDetails } from 'utils/helpers';
import { isValidKeycloakURI } from 'utils/shared/customValidate';
import { Change } from 'interfaces/Event';

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

const sampleDiff: Change[] = [
  {
    lhs: 'test',
    rhs: 'test with changes',
    kind: 'E',
    path: ['projectName'],
  },
  { item: { kind: 'N', rhs: 'https://n' }, kind: 'A', path: ['devValidRedirectUris'] },
];
const expectedFormattedDetails =
  '<ul><li><strong>Edited projectName: </strong><code>test</code> => <code>test with changes</code></li><li><strong>Added to devValidRedirectUris: </strong><code>https://n</code></li></ul>';

describe('format change event details', () => {
  it('Should return the expected html', () => {
    expect(formatChangeEventDetails(sampleDiff)).toEqual(expectedFormattedDetails);
  });
});

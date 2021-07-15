import { realmToIDP, idpToRealm } from 'utils/helpers';

describe('idp to realm', () => {
  it('gives the correct realm for different orders', () => {
    expect(idpToRealm(['github', 'idir'])).toEqual('onestopauth');
    expect(idpToRealm(['idir', 'github'])).toEqual('onestopauth');
  });
  it('works for all realms', () => {
    expect(idpToRealm(['github', 'idir', 'bceid-basic'])).toEqual('onestopauth-basic');
    expect(idpToRealm(['idir', 'github', 'bceid-business'])).toEqual('onestopauth-business');
    expect(idpToRealm(['idir', 'github', 'bceid-business', 'bceid-basic'])).toEqual('onestopauth-both');
  });
});

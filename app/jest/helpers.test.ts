import { realmToIDP, idpToRealm } from 'utils/helpers';

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

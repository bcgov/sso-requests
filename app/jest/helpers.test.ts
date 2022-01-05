import { idpToRealm, getRequestedEnvironments } from 'utils/helpers';
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
    expect(isValidKeycloakURI('ionicapp://a')).toBe(true);
    expect(isValidKeycloakURI('htttps://a')).toBe(true);
    expect(isValidKeycloakURI('https://')).toBe(false);
    expect(isValidKeycloakURI('http://')).toBe(false);
    expect(isValidKeycloakURI('http:/')).toBe(false);
    expect(isValidKeycloakURI(' http:/')).toBe(false);
    expect(isValidKeycloakURI('http://a ')).toBe(false);
    expect(isValidKeycloakURI('http://a b')).toBe(false);
  });
});

const dev = [
  {
    display: 'Development',
    name: 'dev',
  },
];

const test = [
  {
    display: 'Test',
    name: 'test',
  },
];

const prod = [
  {
    display: 'Production',
    name: 'prod',
  },
];

describe('Get Requested Environments', () => {
  it('returns the expected environments for idir', () => {
    expect(
      getRequestedEnvironments({
        realm: 'onestopauth',
        dev: true,
      }),
    ).toEqual(dev);

    expect(
      getRequestedEnvironments({
        realm: 'onestopauth',
        test: true,
      }),
    ).toEqual(test);

    expect(
      getRequestedEnvironments({
        realm: 'onestopauth',
        test: true,
        dev: true,
      }),
    ).toEqual(dev.concat(test));

    expect(
      getRequestedEnvironments({
        realm: 'onestopauth',
        test: true,
        dev: true,
        prod: true,
      }),
    ).toEqual(dev.concat(test).concat(prod));
  });

  it('returns the expected environments for bceid', () => {
    expect(
      getRequestedEnvironments({
        realm: 'onestopauth-basic',
        dev: true,
      }),
    ).toEqual(dev);

    expect(
      getRequestedEnvironments({
        realm: 'onestopauth-basic',
        test: true,
      }),
    ).toEqual(test);

    expect(
      getRequestedEnvironments({
        realm: 'onestopauth-basic',
        test: true,
        dev: true,
      }),
    ).toEqual(dev.concat(test));

    expect(
      getRequestedEnvironments({
        realm: 'onestopauth-basic',
        test: true,
        dev: true,
        prod: true,
        bceidApproved: false,
      }),
    ).toEqual(dev.concat(test));

    expect(
      getRequestedEnvironments({
        realm: 'onestopauth-basic',
        test: true,
        dev: true,
        prod: true,
        bceidApproved: true,
      }),
    ).toEqual(dev.concat(test).concat(prod));
  });
});

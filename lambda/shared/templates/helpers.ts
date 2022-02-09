import { Data } from '../interfaces';
import { formatUrisForEmail, realmToIDP } from '../utils/helpers';

export const processRequest = (request: Data) => {
  const { realm, devValidRedirectUris = [], testValidRedirectUris = [], prodValidRedirectUris = [] } = request;
  const devUris = formatUrisForEmail(devValidRedirectUris, 'Development');
  const testUris = formatUrisForEmail(testValidRedirectUris, 'Test');
  const prodUris = formatUrisForEmail(prodValidRedirectUris, 'Production');
  const idps = realmToIDP(realm);

  return {
    ...request,
    devValidRedirectUris,
    testValidRedirectUris,
    prodValidRedirectUris,
    devUris,
    testUris,
    prodUris,
    idps,
  };
};

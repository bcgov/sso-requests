import { models } from '../../shared/sequelize/models/models';
import { formatUrisForEmail, realmToIDP } from '../utils/helpers';

export const processRequest = (request: any) => {
  if (request instanceof models.request) {
    request = request.get({ plain: true });
  }

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

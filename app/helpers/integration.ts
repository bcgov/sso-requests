import { Integration } from '@app/interfaces/Request';

const bceidRealms = ['onestopauth-basic', 'onestopauth-business', 'onestopauth-both'];
export const usesBceid = (integration: Integration) => {
  if (!integration) return false;

  const { serviceType = 'silver', devIdps = [], realm = '' } = integration;

  if (serviceType === 'gold') {
    return devIdps.some((idp: string) => idp.startsWith('bceid'));
  } else {
    return bceidRealms.includes(realm);
  }
};

export const usesGithub = (integration: Integration) => {
  if (!integration) return false;

  const { serviceType = 'silver', devIdps = [] } = integration;
  if (serviceType !== 'gold') return false;

  return devIdps.some((idp: string) => idp === 'github');
};

export const usesBceidProd = (integration: Integration) => {
  if (!integration) return false;

  const { environments = [] } = integration;

  return usesBceid(integration) && environments.includes('prod');
};

export const usesGithubProd = (integration: Integration) => {
  if (!integration) return false;

  const { environments = [] } = integration;

  return usesGithub(integration) && environments.includes('prod');
};

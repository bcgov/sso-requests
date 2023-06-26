import { Integration } from '@app/interfaces/Request';

const bceidRealms = ['onestopauth-basic', 'onestopauth-business', 'onestopauth-both'];

export const checkBceidBoth = (idp: string) => idp === 'bceidboth';
export const checkIdirGroup = (idp: string) => ['idir', 'azureidir'].includes(idp);
export const checkBceidGroup = (idp: string) => idp.startsWith('bceid');
export const checkNotBceidGroup = (idp: string) => !checkBceidGroup(idp);
export const checkBceidRegularGroup = (idp: string) => ['bceidbasic', 'bceidbusiness'].includes(idp);
export const checkIdirGroupAndNotBceidBoth = (idp: string) => checkIdirGroup(idp) || idp !== 'bceidboth';
export const checkIdirGroupAndNotBceidRegularGroup = (idp: string) =>
  checkIdirGroup(idp) || !checkBceidRegularGroup(idp);
export const checkGithubGroup = (idp: string) => ['githubpublic', 'githubbcgov'].includes(idp);
export const checkNotGithubGroup = (idp: string) => !checkGithubGroup(idp);

export const usesBceid = (integration: Integration) => {
  if (!integration) return false;

  const { serviceType = 'gold', devIdps = [], realm = '' } = integration;

  if (serviceType === 'gold') {
    return devIdps.some(checkBceidGroup);
  } else {
    return bceidRealms.includes(realm);
  }
};

export const usesGithub = (integration: Integration) => {
  if (!integration) return false;

  const { serviceType = 'gold', devIdps = [] } = integration;
  if (serviceType !== 'gold') return false;

  return devIdps.some(checkGithubGroup);
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

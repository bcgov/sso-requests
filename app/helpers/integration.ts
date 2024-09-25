import { Integration } from '@app/interfaces/Request';
import { BcscPrivacyZone } from '@app/interfaces/types';
import { bcscPrivacyZones } from '@app/utils/constants';

export const checkBceidBoth = (idp: string) => idp === 'bceidboth';
export const checkDigitalCredential = (idp: string) => idp === 'digitalcredential';
export const checkBcServicesCard = (idp: string) => idp === 'bcservicescard';
export const checkIdirGroup = (idp: string) => ['idir', 'azureidir'].includes(idp);
export const checkBceidGroup = (idp: string) => idp.startsWith('bceid');
export const checkNotBceidGroup = (idp: string) => !checkBceidGroup(idp);
export const checkBceidRegularGroup = (idp: string) => ['bceidbasic', 'bceidbusiness'].includes(idp);
export const checkIdirGroupAndNotBceidBoth = (idp: string) => checkIdirGroup(idp) || idp !== 'bceidboth';
export const checkIdirGroupAndNotBceidRegularGroup = (idp: string) =>
  checkIdirGroup(idp) || !checkBceidRegularGroup(idp);
export const checkGithubGroup = (idp: string) => ['githubpublic', 'githubbcgov'].includes(idp);
export const checkNotGithubGroup = (idp: string) => !checkGithubGroup(idp);
export const checkNotDigitalCredential = (idp: string) => !checkDigitalCredential(idp);
export const checkNotBcServicesCard = (idp: string) => !checkBcServicesCard(idp);

export const usesBceid = (integration: Integration) => {
  if (!integration) return false;

  const { devIdps = [] } = integration;

  return devIdps.some(checkBceidGroup);
};

export const usesGithub = (integration: Integration) => {
  if (!integration) return false;

  const { devIdps = [] } = integration;

  return devIdps.some(checkGithubGroup);
};

export const usesDigitalCredential = (integration: Integration) => {
  if (!integration) return false;

  const { devIdps = [] } = integration;

  return devIdps.some(checkDigitalCredential);
};

export const usesBcServicesCard = (integration: Integration) => {
  if (!integration) return false;

  const { devIdps = [] } = integration;

  return devIdps.some(checkBcServicesCard);
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

export const usesBcServicesCardProd = (integration: Integration) => {
  if (!integration) return false;

  const { environments = [] } = integration;

  return usesBcServicesCard(integration) && environments.includes('prod');
};

export const usesDigitalCredentialProd = (integration: Integration) => {
  if (!integration) return false;

  const { environments = [] } = integration;

  return usesDigitalCredential(integration) && environments.includes('prod');
};

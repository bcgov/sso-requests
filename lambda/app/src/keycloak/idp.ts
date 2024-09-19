import IdentityProviderRepresentation from 'keycloak-admin/lib/defs/identityProviderRepresentation';
import { getAdminClient } from './adminClient';

interface IdpConfig {
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  logoutUrl?: string;
  userInfoUrl?: string;
  defaultScope?: string;
  useJwksUrl?: boolean;
  jwksUrl?: string;
  issuer?: string;
  clientAuthMethod?: string;
  syncMode?: string;
  disableUserInfo?: boolean;
  validateSignature?: boolean;
}

interface IdpMapperConfig {
  claim: string;
  'user.attribute'?: string;
  attribute?: string;
  syncMode: 'INHERIT' | 'FORCE' | 'IMPORT';
  template?: string;
}

export const getIdp = async (environment: string, alias: string) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  return kcAdminClient.identityProviders.findOne({
    realm: 'standard',
    alias,
  });
};

export const createIdp = async (
  IdpConfig: {
    alias: string;
    displayName: string;
    enabled: boolean;
    config: IdpConfig;
    storeToken?: boolean;
    providerId: string;
    realm: string;
    firstBrokerLoginFlowAlias?: string;
    postBrokerLoginFlowAlias?: string;
    [key: string]: any;
  },
  environment: string,
) => {
  const {
    alias,
    displayName,
    enabled,
    config,
    storeToken,
    providerId,
    realm,
    postBrokerLoginFlowAlias,
    firstBrokerLoginFlowAlias,
  } = IdpConfig;
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  return kcAdminClient.identityProviders.create({
    alias,
    displayName,
    realm,
    enabled,
    config,
    providerId,
    storeToken,
    postBrokerLoginFlowAlias,
    firstBrokerLoginFlowAlias,
  });
};

export const updateIdp = async (idp: IdentityProviderRepresentation, environment: string) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  return kcAdminClient.identityProviders.update({ alias: idp.alias, realm: 'standard' }, idp);
};

export const deleteIdp = async (data: { environment: string; realmName: string; idpAlias: string }) => {
  const { environment, realmName, idpAlias } = data;
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  await kcAdminClient.identityProviders.del({
    realm: realmName,
    alias: idpAlias,
  });
  return true;
};

export const getIdpMappers = async (data: { environment: string; idpAlias: string }) => {
  const { environment, idpAlias } = data;
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  return kcAdminClient.identityProviders.findMappers({
    alias: idpAlias,
    realm: 'standard',
  });
};

export const createIdpMapper = async (data: {
  environment: string;
  name: string;
  idpAlias: string;
  idpMapper: string;
  idpMapperConfig: IdpMapperConfig;
}) => {
  const { environment, idpAlias, idpMapperConfig, name, idpMapper } = data;

  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });

  await kcAdminClient.identityProviders.createMapper({
    alias: idpAlias,
    realm: 'standard',
    identityProviderMapper: {
      identityProviderAlias: idpAlias,
      name,
      identityProviderMapper: idpMapper,
      config: idpMapperConfig,
    },
  });

  return true;
};

export const deleteIdpMapper = async (data: {
  environment: string;
  realmName: string;
  idpAlias: string;
  mapperName: string;
}) => {
  const { environment, realmName, idpAlias, mapperName } = data;
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const mappers = await kcAdminClient.identityProviders.findMappers({
    realm: realmName,
    alias: idpAlias,
  });

  const mapper = mappers.find((m) => m.name === mapperName);
  if (!mapper) return false;

  await kcAdminClient.identityProviders.delMapper({
    realm: realmName,
    alias: idpAlias,
    id: mapper.id,
  });
  return true;
};

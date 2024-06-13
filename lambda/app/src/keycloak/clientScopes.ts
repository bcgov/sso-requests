import { getAdminClient } from './adminClient';

interface ProtocolMapperConfig {
  'user.attribute'?: string;
  'claim.name'?: string;
  /** JSON type used to populate the claim in the payload */
  'jsonType.label'?: 'String' | 'long' | 'int' | 'boolean' | 'JSON';
  /** Add attribute to the id token */
  'id.token.claim'?: boolean;
  /** Add attribute to the access token */
  'access.token.claim'?: boolean;
  /** Add attribute to the userinfo */
  'userinfo.token.claim'?: boolean;
  [key: string]: any;
}

export const getClientScope = async (data: { environment: string; scopeName: string; realmName: string }) => {
  const { environment, realmName, scopeName } = data;
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  return kcAdminClient.clientScopes.findOneByName({
    realm: realmName,
    name: scopeName,
  });
};

export const createClientScope = async (data: { environment: string; realmName: string; scopeName: string }) => {
  const { environment, realmName, scopeName } = data;
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });

  // For some unknown reason this doesnt return the damned result, need to fetch after
  await kcAdminClient.clientScopes.create({
    realm: realmName,
    name: scopeName,
    protocol: 'openid-connect',
  });

  return kcAdminClient.clientScopes.findOneByName({
    realm: realmName,
    name: scopeName,
  });
};

export const deleteClientScope = async (data: { realmName: string; environment: string; scopeName: string }) => {
  const { environment, realmName, scopeName } = data;
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  await kcAdminClient.clientScopes.delByName({ realm: realmName, name: scopeName });
};

export const getClientScopeMapper = async (data: { environment: string; scopeId: string; mapperName: string }) => {
  const { environment, scopeId, mapperName } = data;
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  return kcAdminClient.clientScopes.findProtocolMapperByName({
    realm: 'standard',
    id: scopeId,
    name: mapperName,
  });
};

export const createClientScopeMapper = async (data: {
  environment: string;
  realmName: string;
  scopeName: string;
  protocolMapper: string;
  protocolMapperName: string;
  protocol: string;
  protocolMapperConfig: ProtocolMapperConfig;
}) => {
  const { environment, realmName, scopeName, protocol, protocolMapper, protocolMapperConfig, protocolMapperName } =
    data;
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });

  const clientScopes = await kcAdminClient.clientScopes.find({ realm: realmName });
  if (!clientScopes) return false;

  const clientScope = clientScopes.find((scope) => scope.name === scopeName);
  if (!clientScope) return false;

  await kcAdminClient.clientScopes.addProtocolMapper(
    { realm: realmName, id: clientScope.id },
    {
      name: protocolMapperName,
      protocol,
      protocolMapper,
      config: protocolMapperConfig,
    },
  );

  return true;
};

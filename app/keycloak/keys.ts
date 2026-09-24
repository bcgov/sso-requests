import { KeyMetadataRepresentation } from '@keycloak/keycloak-admin-client/lib/defs/keyMetadataRepresentation';
import { getAdminClient } from './adminClient';

export interface RealmKeyProvider {
  id: string;
  name: string;
  priority: number;
}

export interface RealmKeyCert {
  kid: string;
  certificatePem: string;
  certificateRawBase64: string;
}

export async function createPS256Key(
  name: string,
  environment: string,
  realm: string = 'standard',
  priority: number = 0,
): Promise<{ id: string }> {
  try {
    const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
    return await kcAdminClient.components.create({
      name,
      providerId: 'rsa-generated',
      providerType: 'org.keycloak.keys.KeyProvider',
      realm,
      config: {
        algorithm: ['PS256'],
        priority: [String(priority)],
        active: ['true'],
        keySize: ['4096'],
        enabled: ['true'],
      },
    });
  } catch (err) {
    console.error('Error creating PS256 key:', err);
    throw err;
  }
}

/** All PS256 providers whose name starts with the prefix, so providers created by a rotation stay discoverable. */
export async function listPS256KeyProviders(
  environment: string,
  realm: string,
  namePrefix: string,
): Promise<RealmKeyProvider[]> {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const providers = await kcAdminClient.components.find({ type: 'org.keycloak.keys.KeyProvider', realm });

  return providers
    .filter((provider) => provider.config?.algorithm?.includes('PS256') && (provider.name || '').startsWith(namePrefix))
    .map((provider) => ({
      id: provider.id!,
      name: provider.name!,
      priority: Number(provider.config?.priority?.[0] ?? 0),
    }));
}

/** The provider Keycloak currently signs with, which is the highest priority one. */
export async function getActivePS256KeyProvider(
  environment: string,
  realm: string,
  namePrefix: string,
): Promise<RealmKeyProvider | null> {
  const providers = await listPS256KeyProviders(environment, realm, namePrefix);
  if (providers.length === 0) return null;
  return providers.reduce((highest, provider) => (provider.priority > highest.priority ? provider : highest));
}

export async function updateRealmKeyProvider(
  environment: string,
  realm: string,
  componentId: string,
  updates: { name?: string; priority?: number },
): Promise<void> {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const component = await kcAdminClient.components.findOne({ id: componentId, realm });

  if (!component) {
    throw new Error(`Key provider ${componentId} was not found in the ${realm} realm of ${environment}`);
  }

  await kcAdminClient.components.update(
    { id: componentId, realm },
    {
      ...component,
      ...(updates.name ? { name: updates.name } : {}),
      config: {
        ...component.config,
        ...(updates.priority === undefined ? {} : { priority: [String(updates.priority)] }),
      },
    },
  );
}

export async function getRealmKey(
  name: string,
  environment: string,
  realm: string = 'standard',
  algorithm: string = 'PS256',
): Promise<KeyMetadataRepresentation[]> {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  // Filter to PS256 keys that carry a certificate
  const realmKeyProviders = await kcAdminClient.components.find({ type: 'org.keycloak.keys.KeyProvider', realm });
  const ps256KeyProvider = realmKeyProviders.find((kp) => kp.config?.algorithm?.includes('PS256') && kp.name === name);
  const data = await kcAdminClient.realms.getKeys({ realm });
  return (
    data?.keys?.filter(
      (key) =>
        key.algorithm?.toUpperCase() === algorithm.toUpperCase() &&
        key.certificate &&
        key.status === 'ACTIVE' &&
        key.providerId === ps256KeyProvider?.id,
    ) || []
  );
}

const toRealmKeyCert = (key: KeyMetadataRepresentation): RealmKeyCert => {
  const rawBase64 = key.certificate!;
  return {
    kid: key.kid!,
    certificatePem: `-----BEGIN CERTIFICATE-----\n${rawBase64}\n-----END CERTIFICATE-----`,
    certificateRawBase64: rawBase64,
  };
};

export async function getKeyCert(
  name: string,
  environment: string,
  realm: string = 'standard',
  algorithm: string = 'PS256',
): Promise<RealmKeyCert | null> {
  const keys = await getRealmKey(name, environment, realm, algorithm);
  if (!keys || keys.length === 0) {
    return null;
  }
  return toRealmKeyCert(keys[0]);
}

export async function getKeyCertByProviderId(
  providerId: string,
  environment: string,
  realm: string = 'standard',
  algorithm: string = 'PS256',
): Promise<RealmKeyCert | null> {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const data = await kcAdminClient.realms.getKeys({ realm });
  const key = data?.keys?.find(
    (candidate) =>
      candidate.algorithm?.toUpperCase() === algorithm.toUpperCase() &&
      candidate.certificate &&
      candidate.status === 'ACTIVE' &&
      candidate.providerId === providerId,
  );

  return key ? toRealmKeyCert(key) : null;
}

/** Certificate of the key Keycloak actually signs client assertions with, whatever the provider is named. */
export async function getActivePS256KeyCert(
  environment: string,
  realm: string,
  namePrefix: string,
): Promise<RealmKeyCert | null> {
  const provider = await getActivePS256KeyProvider(environment, realm, namePrefix);
  if (!provider) return null;
  return getKeyCertByProviderId(provider.id, environment, realm, 'PS256');
}

export const removeRealmKey = async (environment: string, kid: string, realm: string = 'standard') => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  await kcAdminClient.components.del({
    id: kid,
    realm,
  });
};

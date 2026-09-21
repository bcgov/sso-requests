import type { NextApiRequest, NextApiResponse } from 'next';
import { Application, KeyCredential } from '@microsoft/microsoft-graph-types';
import { handleError } from '@app/utils/helpers';
import { fetchAllEntraClients } from '@app/queries/entra-client';
import { getAppRegistrationByAppId, replaceKeyCredentials } from '@app/utils/graph-api';
import { buildKeyCredential, computeThumbprint } from '@app/utils/entra-helpers';
import { KC_ENTRA_IDP_REALM, KC_PS256_KEY_PROVIDER_ID } from '@app/utils/constants';
import {
  createPS256Key,
  getActivePS256KeyProvider,
  getKeyCertByProviderId,
  removeRealmKey,
  updateRealmKeyProvider,
  RealmKeyCert,
} from '@app/keycloak/keys';

const ENVIRONMENTS = ['dev', 'test', 'prod'];

// Keycloak signs client assertions with the highest priority key, so these values order the cutover:
// the incoming key sits below the live one until every Entra app trusts it, then jumps above it.
const ACTIVE_KEY_PRIORITY = 100;
const STANDBY_KEY_PRIORITY = 0;
const CUTOVER_KEY_PRIORITY = 200;

interface RotationFailure {
  appId: string;
  message: string;
}

interface RotationResult {
  environment: string;
  rotated: boolean;
  clients: number;
  message?: string;
  cleanupFailures: RotationFailure[];
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

const credentialsFor = (displayName: string, certs: RealmKeyCert[]): KeyCredential[] =>
  certs.map((cert) => buildKeyCredential(displayName, cert.certificatePem, cert.certificateRawBase64, cert.kid));

/**
 * Rotates the PS256 key that Keycloak uses to sign `private_key_jwt` client assertions for Entra.
 *
 * Both certificates are trusted by Entra during the overlap, so no login window is lost. Any failure
 * before the cutover aborts the environment and leaves the existing key signing.
 */
const rotateEnvironment = async (environment: string): Promise<RotationResult> => {
  const currentProvider = await getActivePS256KeyProvider(environment, KC_ENTRA_IDP_REALM, KC_PS256_KEY_PROVIDER_ID);

  if (!currentProvider) {
    throw new Error(`no PS256 key provider named ${KC_PS256_KEY_PROVIDER_ID}* exists in ${environment}`);
  }

  // Normalize first so the standby provider created below can never outrank the live key.
  // The one with the highest priority value (e.g., 100) is used to generate new signatures
  // Any other key provider marked as Active but assigned a lower priority number (e.g., 0) automatically acts as a passive key
  if (currentProvider.priority !== ACTIVE_KEY_PRIORITY) {
    await updateRealmKeyProvider(environment, KC_ENTRA_IDP_REALM, currentProvider.id, {
      priority: ACTIVE_KEY_PRIORITY,
    });
  }

  const currentCert = await getKeyCertByProviderId(currentProvider.id, environment, KC_ENTRA_IDP_REALM);

  const newProvider = await createPS256Key(
    `${KC_PS256_KEY_PROVIDER_ID}-${Date.now()}`,
    environment,
    KC_ENTRA_IDP_REALM,
    STANDBY_KEY_PRIORITY,
  );

  const newCert = await getKeyCertByProviderId(newProvider.id, environment, KC_ENTRA_IDP_REALM);

  if (!newCert) {
    await removeRealmKey(environment, KC_ENTRA_IDP_REALM, newProvider.id);
    throw new Error(`Keycloak did not expose a certificate for the new PS256 key in ${environment}`);
  }

  const newThumbprint = computeThumbprint(newCert.certificateRawBase64);
  const staleCert =
    currentCert && computeThumbprint(currentCert.certificateRawBase64) !== newThumbprint ? currentCert : null;

  const clients = await fetchAllEntraClients(environment);
  const updated: { appId: string; displayName: string; objectId: string }[] = [];

  try {
    for (const client of clients) {
      const appReg = await getAppRegistrationByAppId(client.appId);
      if (!appReg) {
        throw new Error(`Entra application registration not found for appId ${client.appId}`);
      }

      const displayName = appReg.displayName as string;
      // The full desired state is sent because Graph replaces the collection outright and never
      // returns the bytes of the credentials it already holds.
      await replaceKeyCredentials(appReg, credentialsFor(displayName, staleCert ? [staleCert, newCert] : [newCert]));

      // due to eventual consistency, verify with retries
      let verified: Application | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        verified = await getAppRegistrationByAppId(client.appId);
        if (verified?.keyCredentials?.some((credential) => credential.customKeyIdentifier === newThumbprint)) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      if (!verified?.keyCredentials?.some((credential) => credential.customKeyIdentifier === newThumbprint)) {
        throw new Error(`Entra did not persist the new key credential for appId ${client.appId}`);
      }

      updated.push({ appId: client.appId, displayName, objectId: appReg.id as string });
    }
  } catch (err) {
    console.error(`Failed to refresh application key credentials`, err);
    // Nothing signs with the new key yet, so restore the previous credentials and drop the standby provider.
    for (const target of updated) {
      try {
        await replaceKeyCredentials(
          { id: target.objectId } as never,
          credentialsFor(target.displayName, staleCert ? [staleCert] : []),
        );
      } catch (rollbackErr) {
        console.error(`Failed to roll back the new key credential on appId ${target.appId}`, rollbackErr);
      }
    }

    await removeRealmKey(environment, KC_ENTRA_IDP_REALM, newProvider.id).catch((removeErr) =>
      console.error(`Failed to remove the standby PS256 key provider in ${environment}`, removeErr),
    );

    throw err;
  }

  await updateRealmKeyProvider(environment, KC_ENTRA_IDP_REALM, newProvider.id, { priority: CUTOVER_KEY_PRIORITY });

  // Past this point the new key is live, so cleanup problems are reported but never fail the rotation.
  const cleanupFailures: RotationFailure[] = [];

  for (const client of clients) {
    const target = updated.find((candidate) => candidate.appId === client.appId)!;

    try {
      if (staleCert) {
        await replaceKeyCredentials({ id: target.objectId } as never, credentialsFor(target.displayName, [newCert]));
      }

      client.keyThumbprint = newThumbprint;
      await client.save();
    } catch (err) {
      console.error(`Failed to clean up the previous key credential on appId ${client.appId}`, err);
      cleanupFailures.push({ appId: client.appId, message: errorMessage(err) });
    }
  }

  try {
    await removeRealmKey(environment, KC_ENTRA_IDP_REALM, currentProvider.id);
    // Reclaim the canonical name only once the old provider is gone, so the two never collide.
    await updateRealmKeyProvider(environment, KC_ENTRA_IDP_REALM, newProvider.id, {
      name: KC_PS256_KEY_PROVIDER_ID,
      priority: ACTIVE_KEY_PRIORITY,
    });
  } catch (err) {
    console.error(`Failed to retire the previous PS256 key provider in ${environment}`, err);
    cleanupFailures.push({ appId: currentProvider.name, message: errorMessage(err) });
  }

  return { environment, rotated: true, clients: clients.length, cleanupFailures };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { Authorization, authorization } = req.headers || {};
    const authHeader = Authorization || authorization;
    if (!process.env.API_AUTH_SECRET || authHeader !== process.env.API_AUTH_SECRET) {
      return res.status(401).json({ success: false, message: 'not authorized' });
    }

    const { environment } = req.query as { environment?: string };
    if (environment && !ENVIRONMENTS.includes(environment)) {
      return res.status(400).json({ success: false, message: `environment must be one of ${ENVIRONMENTS.join(', ')}` });
    }

    const results: RotationResult[] = [];

    // Environments are isolated: a failed rotation in one leaves the others untouched and still rotating.
    for (const env of environment ? [environment] : ENVIRONMENTS) {
      try {
        results.push(await rotateEnvironment(env));
      } catch (err) {
        console.error(`Failed to rotate the Entra key credentials in ${env}`, err);
        results.push({ environment: env, rotated: false, clients: 0, message: errorMessage(err), cleanupFailures: [] });
      }
    }

    return res.status(200).json({
      success: results.every((result) => result.rotated && result.cleanupFailures.length === 0),
      message: 'Request processed successfully',
      results,
    });
  } catch (error) {
    handleError(res, error);
  }
}

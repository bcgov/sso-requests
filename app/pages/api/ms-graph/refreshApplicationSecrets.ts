import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { fetchAllEntraClientsWithExpiringSecrets } from '@app/queries/entra-client';
import {
  deleteAppRegistrationSecret,
  getAppRegistrationByAppId,
  refreshAppRegistrationSecret,
} from '@app/utils/graph-api';
import { KC_ENTRA_IDP_REALM } from '@app/utils/constants';
import { getIdp, updateIdp } from '@app/keycloak/idp';
import { getIntegrationById } from '@app/queries/request';

const DEFAULT_DAYS_UNTIL_EXPIRY = 21;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let totalClients = 0;
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

    const { daysUntilExpiry } = req.query as { daysUntilExpiry?: string };
    const days = daysUntilExpiry === undefined ? DEFAULT_DAYS_UNTIL_EXPIRY : Number(daysUntilExpiry);
    if (!Number.isFinite(days) || days < 0) {
      return res.status(400).json({ success: false, message: 'daysUntilExpiry must be a non-negative number' });
    }

    const entraClients = await fetchAllEntraClientsWithExpiringSecrets(days);
    totalClients = entraClients.length;

    if (entraClients.length === 0) {
      return res.status(200).json({ success: true, message: 'No expiring Entra clients found' });
    }

    let processed = 0;
    const failures: { appId: string; environment: string; message: string }[] = [];

    for (const client of entraClients) {
      // Isolate failures so one broken client cannot stop the rest of the batch from rotating.
      try {
        const appReg = await getAppRegistrationByAppId(client.appId);
        if (!appReg) {
          throw new Error(`Entra application registration not found for appId ${client.appId}`);
        }

        let newSecret = null;

        const previousSecretKeyId = client.secretKeyId;

        // if the previous secret is missing or expiring within the specified number of days, refresh it
        if (
          !appReg?.passwordCredentials?.some((c) => c.keyId === previousSecretKeyId) ||
          appReg?.passwordCredentials?.some(
            (c) =>
              c.keyId === previousSecretKeyId &&
              new Date(c.endDateTime || 0) <= new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          )
        ) {
          console.log(`Entra application secret for appId ${client.appId} is expiring within ${days} days`);
          newSecret = await refreshAppRegistrationSecret(client.appId);
          if (!newSecret?.secretText || !newSecret?.keyId) {
            throw new Error(`Entra did not return a new secret for appId ${client.appId}`);
          }
          client.secret = newSecret.secretText;
          client.secretKeyId = newSecret.keyId;
          client.secretExpiryDate = newSecret.endDateTime ? new Date(newSecret.endDateTime) : null;
          await client.save();
          await client.reload();

          const request = await getIntegrationById(client.requestId);

          if (request?.status === 'applied' && request.clientId) {
            const existingIdp = await getIdp(client.environment, request.clientId, KC_ENTRA_IDP_REALM);
            if (existingIdp) {
              await updateIdp(
                { ...existingIdp, config: { ...existingIdp.config, clientSecret: client.secret } },
                client.environment,
                KC_ENTRA_IDP_REALM,
              );
            }
          }
          // Retire the old credential only once Keycloak serves the new one, to avoid a login outage.
          if (previousSecretKeyId && appReg.passwordCredentials?.some((c) => c.keyId === previousSecretKeyId)) {
            await deleteAppRegistrationSecret(client.appId, previousSecretKeyId);
          }
          processed++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Failed to refresh the Entra secret for appId ${client.appId} (${client.environment})`, err);
        failures.push({ appId: client.appId, environment: client.environment, message });
      }
    }

    return res.status(200).json({
      success: failures.length === 0,
      message: 'Request processed successfully',
      total: totalClients,
      processed,
      failures,
    });
  } catch (error) {
    handleError(res, error);
  }
}

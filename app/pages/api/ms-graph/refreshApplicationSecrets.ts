import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { fetchAllEntraClientsWithExpiringSecrets } from '@app/queries/entra-client';
import { deleteExpiredEntraClientSecret, getAppRegistration, refreshAppRegistrationSecret } from '@app/utils/graph-api';
import { KC_ENTRA_IDP_REALM } from '@app/utils/constants';
import { getIdp, updateIdp } from '@app/keycloak/idp';
import { getIntegrationById } from '@app/queries/request';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { Authorization, authorization } = req.headers || {};
      const authHeader = Authorization || authorization;
      if (!authHeader || authHeader !== process.env.API_AUTH_SECRET) {
        return res.status(401).json({ success: false, message: 'not authorized' });
      }

      const { daysUntilExpiry = '21' } = req.query as { daysUntilExpiry: string };

      const expiringEntraClients = await fetchAllEntraClientsWithExpiringSecrets(Number(daysUntilExpiry));

      if (expiringEntraClients.length === 0) {
        return res.status(200).json({ success: true, message: 'No expiring Entra clients found' });
      }

      for (const client of expiringEntraClients) {
        const app = await getAppRegistration(client.appName);
        if (!app?.appId) {
          throw new Error(`Entra application not found for client: ${client.appName}`);
        }
        const expiringSecretKeyId = app?.passwordCredentials?.find(
          (cred) =>
            !!cred.endDateTime &&
            new Date(cred.endDateTime) <= new Date(Date.now() + Number(daysUntilExpiry) * 24 * 60 * 60 * 1000),
        )?.keyId;

        const newPwdCred = await refreshAppRegistrationSecret(app.appId);
        client.secret = newPwdCred?.secretText || '';
        client.secretExpiryDate = newPwdCred?.endDateTime || '';
        await client.save();

        const request = await getIntegrationById(client.requestId);

        if (request?.status === 'applied' && request.clientId) {
          const existingIdp = await getIdp(client.environment, request.clientId, KC_ENTRA_IDP_REALM);
          if (existingIdp) {
            await updateIdp(
              { ...existingIdp, config: { ...existingIdp.config, clientSecret: client.secret } },
              client.environment,
              KC_ENTRA_IDP_REALM,
            );

            if (expiringSecretKeyId) {
              await deleteExpiredEntraClientSecret(client.appId, expiringSecretKeyId);
            }
          }
        }
      }

      return res.status(200).json({ success: true, message: 'Request processed successfully' });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}

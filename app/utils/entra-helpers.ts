import { IntegrationData } from '@app/shared/interfaces';
import { KeyCredential } from '@microsoft/microsoft-graph-types';
import { createHash } from 'node:crypto';
import crypto from 'node:crypto';

export function extractCertDates(pem: string): { startDateTime: string; endDateTime: string } {
  const cert = new crypto.X509Certificate(pem);
  return {
    startDateTime: new Date(cert.validFrom).toISOString(),
    endDateTime: new Date(cert.validTo).toISOString(),
  };
}

export function computeThumbprint(derBase64: string): string {
  const derBuffer = Buffer.from(derBase64, 'base64');
  const sha256 = createHash('sha256').update(derBuffer).digest();
  // Graph expects the raw bytes as a base64 string (not base64url)
  return sha256.toString('base64');
}

export function buildKeyCredential(
  displayName: string,
  certPem: string,
  certRawBase64: string,
  keycloakKid: string,
): KeyCredential {
  const { startDateTime, endDateTime } = extractCertDates(certPem);

  return {
    type: 'AsymmetricX509Cert',
    usage: 'Verify',
    displayName: `${displayName} key credential (kid: ${keycloakKid})`,
    key: certRawBase64, // base-64 DER of the X.509 cert
    customKeyIdentifier: computeThumbprint(certRawBase64),
    startDateTime,
    endDateTime,
  };
}

export const getApplicationNotes = (environment: string, request: IntegrationData) => {
  const appEnv = process.env.APP_ENV === 'production' ? 'PROD' : 'SANDBOX';
  return [
    `Created by: ${request.requester}`,
    `On: ${new Date().toISOString()}`,
    `Authentication to this app is brokered by ${appEnv} - ${environment}`,
  ].join('\n');
};

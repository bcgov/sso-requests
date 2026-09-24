import { KeyCredential } from '@microsoft/microsoft-graph-types';
import { createHash } from 'node:crypto';
import crypto from 'node:crypto';
import { MS_GRAPH_API_VERSION, MS_GRAPH_URL } from './constants';

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

export const getApplicationNotes = (data: {
  environment: string;
  requester: string;
  bcgovUnitName: string;
  divisionName: string;
  description: string;
}) => {
  const appEnv = process.env.APP_ENV === 'production' ? 'PROD' : 'SANDBOX';
  return [
    `Created by: ${data.requester}`,
    `On: ${new Date().toISOString()}`,
    `On behalf of: ${data.bcgovUnitName} - ${data.divisionName}`,
    `Description: ${data.description}`,
    `Authentication to this app is brokered by ${appEnv} - ${data.environment}`,
  ].join('\n');
};

export const buildMultiUserSearch = ({
  field,
  search,
  attributes,
}: {
  field: string;
  search: string[];
  attributes: string[];
}) => {
  let url = `${MS_GRAPH_URL}/${MS_GRAPH_API_VERSION}/users?$filter=`;
  for (const s of search) {
    url += `startswith(${field},'${s}') or `;
  }
  url = url.slice(0, -4); // Remove the trailing ' or '
  url += `&$top=100&$select=${attributes.join(',')}`;
  return decodeURIComponent(url);
};

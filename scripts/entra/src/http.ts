import { randomUUID } from 'node:crypto';

import type { ValidationResult } from './types.js';

const MAX_CAPTURE_LENGTH = 4000;

export interface GraphRetryOptions {
  numberOfRetries?: number;
  retryIntervalMs?: number;
  additionalRetryStatusCodes?: number[];
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function redactSensitiveContent(value: string): string {
  return value
    .replace(/"secretText"\s*:\s*"[^"]+"/gi, '"secretText":"[REDACTED]"')
    .replace(/"access_token"\s*:\s*"[^"]+"/gi, '"access_token":"[REDACTED]"')
    .replace(/"client_secret"\s*:\s*"[^"]+"/gi, '"client_secret":"[REDACTED]"')
    .slice(0, MAX_CAPTURE_LENGTH);
}

function normalizeRetryOption(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function getRetryDelayMs(response: Response, retryIntervalMs: number): number {
  const retryAfter = response.headers.get('retry-after');

  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds)) {
      return seconds * 1000;
    }

    const retryDate = Date.parse(retryAfter);

    if (!Number.isNaN(retryDate)) {
      return Math.max(retryDate - Date.now(), 1000);
    }
  }

  return retryIntervalMs;
}

function isRetryableStatus(status: number, additionalRetryStatusCodes: number[]): boolean {
  return status === 404 || status === 429 || status >= 500 || additionalRetryStatusCodes.includes(status);
}

function diagnoseFailure(status: number, errorCode?: string, errorMessage?: string): string[] {
  const combined = `${errorCode ?? ''} ${errorMessage ?? ''}`.toLowerCase();

  if (status === 401) {
    return [
      'Verify the tenant ID, client ID, and credential validity.',
      'Verify that the access token audience is Microsoft Graph.',
      'Check system clock synchronization.',
      'Check firewall, proxy, and TLS interception settings.',
    ];
  }

  if (
    status === 403 ||
    combined.includes('authorization_requestdenied') ||
    combined.includes('insufficient privileges')
  ) {
    return [
      'Grant the documented Microsoft Graph application permission and provide administrator consent.',
      'If using Application.ReadWrite.OwnedBy, ensure the calling service principal owns the target application.',
      'If ownership-based access is insufficient, evaluate Application.ReadWrite.All through an approved least-privilege review.',
      'Review tenant restrictions and workload identity Conditional Access policies.',
    ];
  }

  if (status === 404) {
    return [
      'Verify that the application object ID is being used instead of the application client ID.',
      'Verify that the endpoint path is correct.',
      'Account for Microsoft Entra directory replication delays after resource creation.',
    ];
  }

  if (status === 400) {
    return [
      'Review the request body and Microsoft Graph error message.',
      'Review signInAudience compatibility requirements.',
      'Review redirect URI format and platform restrictions.',
      'Review the optional claims schema and supported claim names.',
    ];
  }

  if (status === 409) {
    return [
      'Check whether a resource with the same unique property already exists.',
      'Verify that the previous test resource was cleaned successfully.',
      'Use the run ID and test-resource tags to locate possible leftovers.',
    ];
  }

  if (status === 429) {
    return [
      'Reduce request concurrency.',
      'Honor the Retry-After response header.',
      'Retry the test after the Microsoft Graph throttling window expires.',
    ];
  }

  if (status >= 500) {
    return [
      'Retry the operation after a delay.',
      'Check Microsoft 365 service health.',
      'Use the request ID and timestamp when opening a Microsoft support case.',
    ];
  }

  return [
    'Review the captured Microsoft Graph error code and message.',
    'Use the request ID and correlation ID to investigate the request.',
    'Review tenant policy, licensing, ownership requirements, and Microsoft service health.',
  ];
}

export interface GraphCallResponse {
  result: ValidationResult;
  data?: any;
}

export async function callGraph(
  token: string,
  baseUrl: string,
  name: string,
  method: string,
  path: string,
  body: unknown,
  requiredPermissions: string[],
  retryOptions: GraphRetryOptions = {},
): Promise<GraphCallResponse> {
  const startedAt = Date.now();
  const clientRequestId = randomUUID();
  const endpoint = `${baseUrl}${path}`;
  const numberOfRetries = normalizeRetryOption(retryOptions.numberOfRetries);
  const retryIntervalMs = normalizeRetryOption(retryOptions.retryIntervalMs);
  const additionalRetryStatusCodes = retryOptions.additionalRetryStatusCodes ?? [];
  const maxAttempts = numberOfRetries + 1;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'client-request-id': clientRequestId,
          'return-client-request-id': 'true',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const responseText = await response.text();

      let responseData: any;

      try {
        responseData = responseText ? JSON.parse(responseText) : undefined;
      } catch {
        responseData = responseText;
      }

      const retryable = isRetryableStatus(response.status, additionalRetryStatusCodes);

      if (retryable && attempt < maxAttempts - 1) {
        const retryDelayMs = getRetryDelayMs(response, retryIntervalMs);

        console.warn(
          `Graph call ${name} returned HTTP ${response.status}; retrying attempt ${
            attempt + 2
          } of ${maxAttempts} in ${retryDelayMs}ms.`,
        );

        await sleep(retryDelayMs);
        continue;
      }

      const graphError = responseData?.error;

      const requestId =
        response.headers.get('request-id') ??
        graphError?.innerError?.['request-id'] ??
        graphError?.innerError?.requestId;

      const returnedClientRequestId = response.headers.get('client-request-id') ?? clientRequestId;

      const correlationId =
        response.headers.get('x-ms-correlation-request-id') ?? graphError?.innerError?.['correlation-id'];

      const details = response.ok
        ? responseText
          ? 'Call succeeded and returned a response.'
          : 'Call succeeded.'
        : redactSensitiveContent(graphError?.message ?? responseText ?? response.statusText);

      return {
        data: responseData,
        result: {
          name,
          method,
          originalEndpoint: path,
          endpoint,
          status: response.ok ? 'PASS' : 'FAIL',
          httpStatus: response.status,
          durationMs: Date.now() - startedAt,
          requestId: requestId ?? undefined,
          clientRequestId: returnedClientRequestId ?? undefined,
          correlationId: correlationId ?? undefined,
          errorCode: graphError?.code,
          details,
          requiredPermissions,
          possibleSolutions: response.ok ? [] : diagnoseFailure(response.status, graphError?.code, graphError?.message),
        },
      };
    } catch (error) {
      lastError = error;
      console.error(`Error during Graph call attempt ${attempt + 1} of ${maxAttempts}:`, error);

      if (attempt < maxAttempts - 1) {
        await sleep(retryIntervalMs);
        continue;
      }
    }
  }

  return {
    result: {
      name,
      method,
      originalEndpoint: path,
      endpoint,
      status: 'FAIL',
      durationMs: Date.now() - startedAt,
      clientRequestId,
      details: String(lastError),
      requiredPermissions,
      possibleSolutions: [
        'Check DNS resolution.',
        'Check outbound firewall and proxy rules.',
        'Check TLS inspection settings.',
        'Check Microsoft Graph availability.',
      ],
    },
  };
}

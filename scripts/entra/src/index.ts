import 'dotenv/config';

import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

import { ClientSecretCredential } from '@azure/identity';

import { callGraph } from './http.js';
import { writeMarkdownReport } from './report.js';

import type { ResourceActivity, ValidationContext, ValidationResult, ValidatorConfig } from './types.js';

const configPath = process.argv[2] ?? 'config.json';

const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as ValidatorConfig;

const validationMode = process.env.VALIDATION_MODE?.toLowerCase() ?? 'dry-run';

const dryRun = validationMode !== 'live';

const graphBaseUrl = process.env.GRAPH_BASE_URL ?? 'https://graph.microsoft.com/v1.0';

const reportPath = process.env.REPORT_PATH ?? './validation-report.md';

const allowPermanentDelete = process.env.ALLOW_PERMANENT_DELETE?.toLowerCase() === 'true';

const requiredEnvironmentVariables = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'] as const;

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    throw new Error(`Required environment variable is missing: ${variableName}`);
  }
}

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!,
);

const accessToken = await credential.getToken('https://graph.microsoft.com/.default');

if (!accessToken) {
  throw new Error('Microsoft Graph access-token acquisition failed.');
}

const runId = randomUUID();

const defaultRequiredPermissions = [
  'Application.ReadWrite.OwnedBy when ownership applies',
  'Application.ReadWrite.All when ownership-based access is insufficient',
];

const context: ValidationContext = {
  dryRun,
  baseUrl: graphBaseUrl,
  token: accessToken.token,
  prefix: config.testPrefix,
  runId,
  config,
  results: [],
  activities: [],
  ownedResourceIds: new Set<string>(),
};

function addPlannedResult(name: string, method: string, path: string, dependency?: string): void {
  context.results.push({
    name,
    method,
    originalEndpoint: path,
    endpoint: `${graphBaseUrl}${path}`,
    status: 'PLANNED',
    durationMs: 0,
    details: 'Dry run: no Microsoft Graph request was sent.',
    requiredPermissions: defaultRequiredPermissions,
    possibleSolutions: [],
    resourceDependency: dependency,
  });
}

async function executeCall(
  name: string,
  method: string,
  path: string,
  body?: unknown,
  dependency?: string,
  numberOfRetries = 0,
  retryIntervalMs = 0,
  additionalRetryStatusCodes: number[] = [],
): Promise<any> {
  if (context.dryRun) {
    addPlannedResult(name, method, path, dependency);
    return undefined;
  }

  const response = await callGraph(
    context.token,
    context.baseUrl,
    name,
    method,
    path,
    body,
    defaultRequiredPermissions,
    {
      numberOfRetries,
      retryIntervalMs,
      additionalRetryStatusCodes,
    },
  );

  response.result.resourceDependency = dependency;
  context.results.push(response.result);

  return response.data;
}

function recordOwnedResource(type: string, resource: Record<string, any>): void {
  if (!resource?.id) {
    throw new Error(`${type} creation response did not contain an object ID.`);
  }

  context.ownedResourceIds.add(resource.id);

  context.activities.push({
    type,
    id: resource.id,
    displayName: resource.displayName,
    createdAt: new Date().toISOString(),
    cleanupStatus: 'PENDING',
  });
}

function findActivity(resourceId: string): ResourceActivity | undefined {
  return context.activities.find((activity) => activity.id === resourceId);
}

function updateCleanupStatus(resourceId: string, status: string): void {
  const activity = findActivity(resourceId);

  if (!activity) {
    return;
  }

  activity.cleanedAt = new Date().toISOString();
  activity.cleanupStatus = status;
}

function lastCallPassed(): boolean {
  return context.results.at(-1)?.status === 'PASS';
}

async function cleanupServicePrincipal(): Promise<void> {
  const servicePrincipalId = context.servicePrincipal?.id;

  if (!servicePrincipalId) {
    return;
  }

  if (!context.ownedResourceIds.has(servicePrincipalId)) {
    context.results.push({
      name: 'Cleanup service principal',
      method: 'DELETE',
      originalEndpoint: `/servicePrincipals/${servicePrincipalId}`,
      endpoint: `${context.baseUrl}/servicePrincipals/${servicePrincipalId}`,
      status: 'SKIPPED',
      durationMs: 0,
      details: 'Deletion blocked because the object ID is not in the run ownership allow-list.',
      requiredPermissions: defaultRequiredPermissions,
      possibleSolutions: [],
    });

    return;
  }

  await executeCall(
    'Cleanup service principal',
    'DELETE',
    `/servicePrincipals/${servicePrincipalId}`,
    undefined,
    'Script-created service principal',
    5,
    6000,
  );

  updateCleanupStatus(servicePrincipalId, lastCallPassed() ? 'SUCCESS' : 'FAILED');

  if (lastCallPassed()) {
    context.servicePrincipal = undefined;
  }
}

async function cleanupApplication(): Promise<void> {
  const applicationId = context.application?.id;

  if (!applicationId) {
    return;
  }

  if (!context.ownedResourceIds.has(applicationId)) {
    context.results.push({
      name: 'Cleanup application',
      method: 'DELETE',
      originalEndpoint: `/applications/${applicationId}`,
      endpoint: `${context.baseUrl}/applications/${applicationId}`,
      status: 'SKIPPED',
      durationMs: 0,
      details: 'Deletion blocked because the object ID is not in the run ownership allow-list.',
      requiredPermissions: defaultRequiredPermissions,
      possibleSolutions: [],
    });

    return;
  }

  await executeCall(
    'Cleanup application',
    'DELETE',
    `/applications/${applicationId}`,
    undefined,
    'Script-created application',
    5,
    6000,
  );

  updateCleanupStatus(applicationId, lastCallPassed() ? 'SUCCESS' : 'FAILED');

  if (lastCallPassed()) {
    context.application = undefined;
  }
}

async function cleanup(): Promise<void> {
  if (context.dryRun) {
    return;
  }

  await cleanupServicePrincipal();
  await cleanupApplication();
}

try {
  /*
   * 1. Create an application registration.
   */
  const application = await executeCall('Create application', 'POST', '/applications', {
    displayName: `${context.prefix}-${context.runId}`,
    signInAudience: 'AzureADMyOrg',
    tags: ['Validation/Test Resource', 'Script-generated', `run:${context.runId}`],
  });

  if (!context.dryRun && !application) {
    throw new Error('The test application could not be created. Dependent tests cannot continue.');
  }

  const applicationObjectId = application?.id ?? '{script-created-application-object-id}';

  context.application = await executeCall(
    'Read application registration',
    'GET',
    `/applications/${applicationObjectId}`,
    undefined,
    'Script-created application',
    5,
    6000,
  );

  if (context.application) {
    recordOwnedResource('application', context.application);
  }

  if (!context.dryRun && !context.application) {
    throw new Error('The test application registration could not be read. Dependent tests cannot continue.');
  }

  const applicationClientId = context.application?.appId ?? '{script-created-application-client-id}';

  /*
   * 2. Create the corresponding enterprise application.
   */
  const servicePrincipal = await executeCall(
    'Create service principal',
    'POST',
    '/servicePrincipals',
    {
      appId: applicationClientId,
      tags: ['Validation/Test Resource', 'Script-generated', `run:${context.runId}`],
    },
    'Script-created application',
  );

  context.servicePrincipal = await executeCall(
    'Read service principal',
    'GET',
    `/servicePrincipals/${servicePrincipal?.id}`,
    undefined,
    'Script-created service principal',
    5,
    6000,
  );

  if (context.servicePrincipal) {
    recordOwnedResource('servicePrincipal', context.servicePrincipal);
  }

  if (!context.dryRun && !context.servicePrincipal) {
    throw new Error('The test service principal could not be read. Dependent tests cannot continue.');
  }

  /*
   * 3 and 4. Configure the Web platform and Web redirect URIs.
   */
  await executeCall(
    'Configure Web platform and redirect URIs',
    'PATCH',
    `/applications/${applicationObjectId}`,
    {
      web: {
        redirectUris: config.redirectUris.web,
      },
    },
    'Script-created application',
  );

  /*
   * 3 and 4. Configure the SPA platform and SPA redirect URIs.
   */
  await executeCall(
    'Configure SPA platform and redirect URIs',
    'PATCH',
    `/applications/${applicationObjectId}`,
    {
      spa: {
        redirectUris: config.redirectUris.spa,
      },
    },
    'Script-created application',
  );

  /*
   * 5. Set supported account types.
   */
  await executeCall(
    'Set supported account types',
    'PATCH',
    `/applications/${applicationObjectId}`,
    {
      signInAudience: config.signInAudience,
    },
    'Script-created application',
  );

  /*
   * 6. Configure optional claims.
   */
  await executeCall(
    'Configure optional claims',
    'PATCH',
    `/applications/${applicationObjectId}`,
    {
      optionalClaims: config.optionalClaims,
    },
    'Script-created application',
  );

  /*
   * 7. Create a short-lived client secret.
   *
   * The returned secretText is kept only in the response object and is
   * never logged or added to the report.
   */
  const passwordCredential = await executeCall(
    'Create client secret',
    'POST',
    `/applications/${applicationObjectId}/addPassword`,
    {
      passwordCredential: {
        displayName: `validator-${context.runId}`,
        endDateTime: new Date(Date.now() + config.secretLifetimeMinutes * 60_000).toISOString(),
      },
    },
    'Script-created application',
  );

  context.secretKeyId = passwordCredential?.keyId;

  /*
   * 8. Remove the client secret created by this run.
   */
  await executeCall(
    'Remove client secret',
    'POST',
    `/applications/${applicationObjectId}/removePassword`,
    {
      keyId: context.secretKeyId ?? '{keyId-returned-by-addPassword}',
    },
    'Script-created secret',
    5,
    6000,
    [400],
  );

  /*
   * 9. Delete the script-created service principal first.
   *
   * Application and service-principal object IDs are different.
   * Restoring an application does not automatically restore its
   * service principal.
   */
  if (!context.dryRun && context.servicePrincipal?.id && context.ownedResourceIds.has(context.servicePrincipal.id)) {
    const servicePrincipalId = context.servicePrincipal.id;

    await executeCall(
      'Decommission service principal',
      'DELETE',
      `/servicePrincipals/${servicePrincipalId}`,
      undefined,
      'Script-created service principal',
      5,
      6000,
    );

    updateCleanupStatus(servicePrincipalId, lastCallPassed() ? 'SUCCESS' : 'FAILED');

    if (lastCallPassed()) {
      context.servicePrincipal = undefined;
    }
  } else if (context.dryRun) {
    addPlannedResult(
      'Decommission service principal',
      'DELETE',
      '/servicePrincipals/{script-created-service-principal-id}',
      'Script-created service principal',
    );
  }

  /*
   * 9. Soft-delete the application.
   */
  await executeCall(
    'Decommission application',
    'DELETE',
    `/applications/${applicationObjectId}`,
    undefined,
    'Script-created application',
    5,
    6000,
  );

  const applicationWasSoftDeleted = lastCallPassed();

  /*
   * 10. Restore the soft-deleted application.
   */
  if (applicationWasSoftDeleted) {
    await executeCall(
      'Restore application',
      'POST',
      `/directory/deletedItems/${applicationObjectId}/restore`,
      {},
      'Soft-deleted script-created application',
      5,
      6000,
    );
  } else {
    context.results.push({
      name: 'Restore application',
      method: 'POST',
      originalEndpoint: `/directory/deletedItems/${applicationObjectId}/restore`,
      endpoint: `${context.baseUrl}/directory/deletedItems/${applicationObjectId}/restore`,
      status: 'SKIPPED',
      durationMs: 0,
      details: 'Restore skipped because the application was not soft-deleted successfully.',
      requiredPermissions: defaultRequiredPermissions,
      possibleSolutions: [],
      resourceDependency: 'Soft-deleted script-created application',
    });
  }

  const applicationWasRestored = applicationWasSoftDeleted && lastCallPassed();

  /*
   * Read the restored object so cleanup can still remove it.
   */
  if (!context.dryRun && applicationWasRestored) {
    const restoredApplication = await executeCall(
      'Read restored application',
      'GET',
      `/applications/${applicationObjectId}`,
      undefined,
      'Restored script-created application',
      5,
      6000,
    );

    if (restoredApplication?.id) {
      context.application = restoredApplication;
    }
  }

  /*
   * Permanent deletion is irreversible and separately gated.
   */
  if (allowPermanentDelete && applicationWasRestored) {
    await executeCall(
      'Soft-delete application before permanent deletion',
      'DELETE',
      `/applications/${applicationObjectId}`,
      undefined,
      'Script-created application',
      5,
      6000,
    );

    const applicationWasSoftDeletedAgain = lastCallPassed();

    if (applicationWasSoftDeletedAgain) {
      await executeCall(
        'Permanently delete application',
        'DELETE',
        `/directory/deletedItems/${applicationObjectId}`,
        undefined,
        'Soft-deleted script-created application',
        5,
        6000,
      );
    } else {
      context.results.push({
        name: 'Permanently delete application',
        method: 'DELETE',
        originalEndpoint: `/directory/deletedItems/${applicationObjectId}`,
        endpoint: `${context.baseUrl}/directory/deletedItems/${applicationObjectId}`,
        status: 'SKIPPED',
        durationMs: 0,
        details: 'Permanent deletion skipped because the application was not soft-deleted successfully.',
        requiredPermissions: defaultRequiredPermissions,
        possibleSolutions: [],
        resourceDependency: 'Soft-deleted script-created application',
      });
    }

    if (!context.dryRun) {
      updateCleanupStatus(applicationObjectId, lastCallPassed() ? 'SUCCESS' : 'FAILED');

      if (lastCallPassed()) {
        context.application = undefined;
      }
    }
  } else if (allowPermanentDelete) {
    context.results.push({
      name: 'Soft-delete application before permanent deletion',
      method: 'DELETE',
      originalEndpoint: `/applications/${applicationObjectId}`,
      endpoint: `${context.baseUrl}/applications/${applicationObjectId}`,
      status: 'SKIPPED',
      durationMs: 0,
      details: 'Soft-delete before permanent deletion skipped because the application was not restored successfully.',
      requiredPermissions: defaultRequiredPermissions,
      possibleSolutions: [],
      resourceDependency: 'Script-created application',
    });

    context.results.push({
      name: 'Permanently delete application',
      method: 'DELETE',
      originalEndpoint: `/directory/deletedItems/${applicationObjectId}`,
      endpoint: `${context.baseUrl}/directory/deletedItems/${applicationObjectId}`,
      status: 'SKIPPED',
      durationMs: 0,
      details: 'Permanent deletion skipped because the application was not restored successfully.',
      requiredPermissions: defaultRequiredPermissions,
      possibleSolutions: [],
      resourceDependency: 'Soft-deleted script-created application',
    });
  } else {
    context.results.push({
      name: 'Permanently delete application',
      method: 'DELETE',
      originalEndpoint: '/directory/deletedItems/{id}',
      endpoint: `${context.baseUrl}/directory/deletedItems/{id}`,
      status: 'SKIPPED',
      durationMs: 0,
      details:
        'Safety gate blocked irreversible deletion. Set ALLOW_PERMANENT_DELETE=true to test permanent deletion of only the application created by this run.',
      requiredPermissions: defaultRequiredPermissions,
      possibleSolutions: [],
    });
  }
} catch (error) {
  const workflowFailure: ValidationResult = {
    name: 'Validation workflow',
    method: 'N/A',
    originalEndpoint: 'N/A',
    endpoint: 'N/A',
    status: 'FAIL',
    durationMs: 0,
    details: String(error),
    requiredPermissions: [],
    possibleSolutions: [
      'Review the endpoint result immediately preceding this workflow error.',
      'Verify that dependent resources were created successfully.',
      'Review the generated cleanup results.',
    ],
  };

  context.results.push(workflowFailure);
} finally {
  try {
    await cleanup();
  } catch (cleanupError) {
    context.results.push({
      name: 'Final cleanup',
      method: 'DELETE',
      originalEndpoint: 'Multiple resources',
      endpoint: 'Multiple resources',
      status: 'FAIL',
      durationMs: 0,
      details: String(cleanupError),
      requiredPermissions: defaultRequiredPermissions,
      possibleSolutions: [
        'Search for resources using the run ID.',
        'Verify ownership before manually deleting any remaining resource.',
        'Use the captured request IDs to investigate cleanup failures.',
      ],
    });
  }

  writeMarkdownReport(context, reportPath);

  console.log(`Validation mode: ${validationMode}`);
  console.log(`Run ID: ${context.runId}`);
  console.log(`Report written to: ${reportPath}`);
}

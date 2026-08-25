import fs from 'node:fs';

import type { ResourceActivity, ValidationContext, ValidationResult } from './types.js';

function escapeMarkdown(value: unknown): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function formatPermissions(result: ValidationResult): string {
  return result.requiredPermissions.length > 0 ? result.requiredPermissions.join(', ') : 'Not specified';
}

function createExecutiveSummary(context: ValidationContext): string {
  const passed = context.results.filter((result) => result.status === 'PASS').length;

  const failed = context.results.filter((result) => result.status === 'FAIL').length;

  const executed = context.results.filter((result) => result.status === 'PASS' || result.status === 'FAIL').length;

  const planned = context.results.filter((result) => result.status === 'PLANNED').length;

  const skipped = context.results.filter((result) => result.status === 'SKIPPED').length;

  const created = context.activities.filter((activity) => Boolean(activity.createdAt)).length;

  const cleaned = context.activities.filter((activity) => activity.cleanupStatus === 'SUCCESS').length;

  const successRate = executed > 0 ? ((passed / executed) * 100).toFixed(1) : '0.0';

  return `
## Executive Summary

- Total results: ${context.results.length}
- Executed endpoints: ${executed}
- Passed: ${passed}
- Failed: ${failed}
- Planned in dry-run: ${planned}
- Skipped: ${skipped}
- Success rate: ${successRate}%
- Resources created: ${created}
- Resources cleaned successfully: ${cleaned}
`;
}

function createResultsSection(results: ValidationResult[]): string {
  let output = `
## Endpoint Validation Results

| Name | Method | Endpoint | HTTP | Status | Runtime ms | Required permissions | Resource dependency | Notes |
|---|---|---|---:|---|---:|---|---|---|
`;

  for (const result of results) {
    output += [
      '|',
      escapeMarkdown(result.name),
      '|',
      escapeMarkdown(result.method),
      '|',
      escapeMarkdown(result.endpoint),
      '|',
      result.httpStatus ?? '',
      '|',
      result.status,
      '|',
      result.durationMs,
      '|',
      escapeMarkdown(formatPermissions(result)),
      '|',
      escapeMarkdown(result.resourceDependency),
      '|',
      escapeMarkdown(result.details),
      '|\n',
    ].join('');
  }

  return output;
}

function createFailureSection(results: ValidationResult[]): string {
  const failures = results.filter((result) => result.status === 'FAIL');

  let output = `
## Failed Endpoint Analysis
`;

  if (failures.length === 0) {
    return `${output}
No failed endpoint calls were recorded.
`;
  }

  for (const failure of failures) {
    output += `
### ${escapeMarkdown(failure.name)}

- Method: ${escapeMarkdown(failure.method)}
- Endpoint: ${escapeMarkdown(failure.endpoint)}
- HTTP status: ${failure.httpStatus ?? 'Not available'}
- Graph error code: ${escapeMarkdown(failure.errorCode)}
- Request ID: ${escapeMarkdown(failure.requestId)}
- Client request ID: ${escapeMarkdown(failure.clientRequestId)}
- Correlation ID: ${escapeMarkdown(failure.correlationId)}
- Required permissions: ${escapeMarkdown(formatPermissions(failure))}
- Resource dependency: ${escapeMarkdown(failure.resourceDependency)}
- Error details: ${escapeMarkdown(failure.details)}
- Confidence level: Medium

#### Possible solutions

`;

    if (failure.possibleSolutions.length === 0) {
      output += '- Review the Microsoft Graph response and tenant audit logs.\n';
    } else {
      for (const solution of failure.possibleSolutions) {
        output += `- ${escapeMarkdown(solution)}\n`;
      }
    }
  }

  return output;
}

function createResourceSection(activities: ResourceActivity[]): string {
  let output = `
## Resource Activity

| Type | Object ID | Display name | Created | Cleaned | Cleanup status |
|---|---|---|---|---|---|
`;

  if (activities.length === 0) {
    output += '| None | | | | | No resources were created by this run |\n';

    return output;
  }

  for (const activity of activities) {
    output += [
      '|',
      escapeMarkdown(activity.type),
      '|',
      escapeMarkdown(activity.id),
      '|',
      escapeMarkdown(activity.displayName),
      '|',
      escapeMarkdown(activity.createdAt),
      '|',
      escapeMarkdown(activity.cleanedAt),
      '|',
      escapeMarkdown(activity.cleanupStatus),
      '|\n',
    ].join('');
  }

  return output;
}

function createAppendix(context: ValidationContext): string {
  const permissions = Array.from(new Set(context.results.flatMap((result) => result.requiredPermissions)));

  return `
## Appendix

### Execution information

- Run ID: \`${context.runId}\`
- Mode: **${context.dryRun ? 'DRY RUN' : 'LIVE'}**
- Microsoft Graph base URL: \`${context.baseUrl}\`
- Tenant ID: \`${process.env.AZURE_TENANT_ID ?? 'Not supplied'}\`
- Caller client ID: \`${process.env.AZURE_CLIENT_ID ?? 'Not supplied'}\`

### Permission inventory referenced by this validator

${
  permissions.length > 0
    ? permissions.map((permission) => `- ${permission}`).join('\n')
    : '- No permissions were recorded.'
}

### Security note

No access tokens, client secrets, or returned secret text are written to this report. Secret values returned by Microsoft Graph are intentionally discarded.
`;
}

export function writeMarkdownReport(context: ValidationContext, reportPath: string): void {
  const report = `# Microsoft Entra Endpoint Validation Report

Generated: ${new Date().toISOString()}
Run ID: \`${context.runId}\`
Mode: **${context.dryRun ? 'DRY RUN' : 'LIVE'}**

${createExecutiveSummary(context)}
${createResultsSection(context.results)}
${createFailureSection(context.results)}
${createResourceSection(context.activities)}
${createAppendix(context)}
`;

  fs.writeFileSync(reportPath, report, 'utf8');
}

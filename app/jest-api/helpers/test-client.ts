import { createServer, IncomingMessage, ServerResponse } from 'http';
import { NextApiHandler } from 'next';
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver';
import request from 'supertest';

// make sure to remove /index.ts from the below routes
const knownRoutes = [
  '/api/request-metadata',
  '/api/heartbeat',
  '/api/idir-users',
  '/api/bc-services-card/claim-types',
  '/api/bc-services-card/privacy-zones',
  '/api/allowed-teams',
  '/api/requests',
  '/api/requests/[id]/restore',
  '/api/requests/[id]/logs',
  '/api/requests/[id]/resubmit',
  '/api/requests/[id]/metrics',
  '/api/bceid-webservice/idir/search',
  '/api/bceid-webservice/idir/import',
  '/api/requests-all',
  '/api/github/discussions',
  '/api/request',
  '/api/surveys',
  '/api/events',
  '/api/teams/verify',
  '/api/teams/[teamId]/service-accounts',
  '/api/teams/[teamId]/service-accounts/[saId]/restore',
  '/api/teams/[teamId]/service-accounts/[saId]/credentials',
  '/api/teams/[teamId]/service-accounts/[saId]',
  '/api/teams/[teamId]/invite',
  '/api/teams/[teamId]/members/[memberId]',
  '/api/teams/[teamId]/members',
  '/api/teams/[teamId]',
  '/api/teams',
  '/api/installation',
  '/api/verify-token',
  '/api/allowed-teams/[id]',
  '/api/me',
  '/api/keycloak/delete-role',
  '/api/keycloak/role-users',
  '/api/keycloak/bulk-roles',
  '/api/keycloak/role',
  '/api/keycloak/get-composite-roles',
  '/api/keycloak/set-composite-roles',
  '/api/keycloak/roles',
  '/api/keycloak/users',
  '/api/keycloak/user-roles',
  '/api/delete-inactive-idir-users',
  '/api/team-integrations/[teamId]',
  '/api/reports/all-bceid-approved-requests-and-events',
  '/api/reports/database-tables',
  '/api/reports/data-integrity',
  '/api/reports/all-standard-integrations',
];

export function inferRoutePattern(url: string): string | null {
  for (const pattern of knownRoutes) {
    const regexPattern = pattern.replace(/\[([^\]]+)\]/g, '([^/]+)');
    const regex = new RegExp(`^${regexPattern}$`);

    if (regex.test(url)) {
      return pattern;
    }
  }
  return null;
}

export function extractRouteParams(url: string): Record<string, string> {
  const routePattern = inferRoutePattern(url);
  if (!routePattern) {
    return {};
  }
  const urlSegments = url.split('/').filter(Boolean); // Split and remove empty segments
  const patternSegments = routePattern.split('/').filter(Boolean); // Define route pattern

  const params: Record<string, string> = {};

  patternSegments.forEach((segment, index) => {
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const paramName = segment.slice(1, -1); // Extract parameter name from [param]
      params[paramName] = urlSegments[index] || '';
    }
  });

  return params;
}

export const testClient = (handler: NextApiHandler, bodyParser = true) => {
  return request.agent(
    createServer((req: IncomingMessage, res: ServerResponse) => {
      const [url, queryParams] = req.url!.split('?');
      const params = new URLSearchParams(queryParams);
      const query = Object.fromEntries(params);

      const customConfig = {
        api: {
          bodyParser,
        },
      };

      return apiResolver(
        req,
        res,
        { ...query, ...extractRouteParams(url) },
        Object.assign(handler, { config: customConfig }),
        {
          previewModeEncryptionKey: '',
          previewModeId: '',
          previewModeSigningKey: '',
        },
        true,
      );
    }),
  );
};

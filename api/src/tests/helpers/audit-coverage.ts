import fs from 'node:fs';
import path from 'node:path';
import models from '@/sequelize/models/models';

// Route coverage for the audit record. Every request a test makes to the test server is recorded with the
// actions its events took (by the request's `req_id`), and `zz.audit-coverage.test.ts`, which runs last,
// checks every write route in routes.ts against the manifest in `audit-coverage-manifest.ts`.

const ROUTES_FILE = path.resolve(__dirname, '../../routes.ts');

const declaredRoutes = () =>
  Array.from(
    fs.readFileSync(ROUTES_FILE, 'utf8').matchAll(/router\.(get|post|put|delete|patch)\(\s*`([^`]+)`/g),
    ([, method, route]) => `${method.toUpperCase()} ${route}`,
  );

/** Every route declared in routes.ts, as `METHOD /path/:param`. */
export const discoverRoutes = declaredRoutes;

/** The routes in routes.ts that handle POST, PUT, DELETE or PATCH. */
export const discoverWriteRoutes = () => declaredRoutes().filter((route) => !route.startsWith('GET '));

export type CoverageRecord = { route: string; status: number; actions: { action: string; outcome: string }[] };

/** Called by the test server as each response ends. */
export const recordAuditCoverage = async (route: string, status: number, reqId: unknown) => {
  const file = process.env.AUDIT_COVERAGE_FILE;
  if (!file || typeof reqId !== 'string') return;
  const events = await models.event.findAll({ where: { reqId }, attributes: ['eventCode', 'outcome'], raw: true });
  const record: CoverageRecord = {
    route,
    status,
    actions: events.map((event: any) => ({ action: event.eventCode, outcome: event.outcome })),
  };
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`);
};

export const readAuditCoverage = (): CoverageRecord[] => {
  const file = process.env.AUDIT_COVERAGE_FILE;
  if (!file || !fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

import fs from 'node:fs';
import path from 'node:path';
import { models } from '@app/shared/sequelize/models/models';

// Route coverage for the audit record. Every request a test makes through the test client is recorded
// with the actions its events took (by the request's `req_id`), and `zz.audit-coverage.test.ts`, which
// runs last, checks every write route against the manifest in `audit-coverage-manifest.ts`.

const API_DIR = path.resolve(__dirname, '../../pages/api');
const WRITE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

const routeOf = (file: string) =>
  '/api/' +
  path
    .relative(API_DIR, file)
    .replace(/\.ts$/, '')
    .replace(/(^|\/)index$/, '');

const listFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });

/** Every route under pages/api, e.g. `/api/teams/[teamId]`. */
export const discoverRoutes = () => listFiles(API_DIR).map((file) => routeOf(file).replace(/\/$/, ''));

/** Every route under pages/api and the write methods its handler branches on. */
export const discoverWriteRoutes = () =>
  listFiles(API_DIR).flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    const methods = WRITE_METHODS.filter((method) => source.includes(`req.method === '${method}'`));
    return methods.map((method) => `${method} ${routeOf(file).replace(/\/$/, '')}`);
  });

const routePatterns = () =>
  listFiles(API_DIR)
    .map((file) => routeOf(file).replace(/\/$/, ''))
    // Static segments before dynamic ones, so `/api/teams/[teamId]` never swallows `/api/teams`.
    .sort((a, b) => (a.match(/\[/g)?.length ?? 0) - (b.match(/\[/g)?.length ?? 0))
    .map((route) => ({ route, regex: new RegExp(`^${route.replace(/\[[^\]]+\]/g, '[^/]+')}/?$`) }));

/** The pages/api route a request path was served by, e.g. `/api/teams/[teamId]`. */
export const routeFor = (urlPath: string) => routePatterns().find(({ regex }) => regex.test(urlPath))?.route ?? urlPath;

export type CoverageRecord = { route: string; status: number; actions: { action: string; outcome: string }[] };

/** Called by the test client as each response ends. */
export const recordAuditCoverage = async (method: string, urlPath: string, status: number, reqId: unknown) => {
  const file = process.env.AUDIT_COVERAGE_FILE;
  if (!file || typeof reqId !== 'string') return;
  const events = await models.event.findAll({ where: { reqId }, attributes: ['eventCode', 'outcome'], raw: true });
  const record: CoverageRecord = {
    route: `${method} ${routeFor(urlPath)}`,
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

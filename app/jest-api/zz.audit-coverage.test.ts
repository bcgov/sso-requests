import { discoverRoutes, discoverWriteRoutes, readAuditCoverage } from './helpers/audit-coverage';
import { AUDIT_COVERAGE } from './audit-coverage-manifest';

// Runs last (see testSequencer.js): every other file's requests have been recorded by then.

// Written by whichever route first sees a user, as part of signing them in: never a route's own action.
const SIGN_IN_ACTIONS = ['user-create', 'user-update'];
const ACCEPTED = ['requested', 'success'];

const recordedActions = () => {
  const byRoute = new Map<string, Set<string>>();
  for (const record of readAuditCoverage()) {
    const actions = byRoute.get(record.route) ?? new Set<string>();
    record.actions
      .filter(({ action, outcome }) => ACCEPTED.includes(outcome) && !SIGN_IN_ACTIONS.includes(action))
      .forEach(({ action }) => actions.add(action));
    byRoute.set(record.route, actions);
  }
  return byRoute;
};

// A run of only some files cannot have reached every route; only the static checks apply to it.
const fullRun = process.env.AUDIT_COVERAGE_PARTIAL !== 'true';
const onFullRun = fullRun ? it : it.skip;

describe('audit coverage of write routes', () => {
  it('has a manifest entry for every write route', () => {
    const missing = discoverWriteRoutes().filter((route) => !AUDIT_COVERAGE[route]);
    expect(missing).toEqual([]);
  });

  it('has no manifest entry for a route that no longer exists', () => {
    const routes = discoverRoutes();
    const stale = Object.keys(AUDIT_COVERAGE).filter((key) => {
      const [method, route] = key.split(' ');
      return !routes.includes(route) || (method !== 'GET' && !discoverWriteRoutes().includes(key));
    });
    expect(stale).toEqual([]);
  });

  onFullRun('sees every audited route record each of its actions', () => {
    const recorded = recordedActions();
    const unrecorded = Object.entries(AUDIT_COVERAGE).flatMap(([route, entry]) =>
      'actions' in entry
        ? entry.actions.filter((action) => !recorded.get(route)?.has(action)).map((action) => `${route} → ${action}`)
        : [],
    );
    expect(unrecorded).toEqual([]);
  });

  onFullRun('has a manifest entry for every GET route seen writing', () => {
    const writingGets = Array.from(recordedActions().entries())
      .filter(([route, actions]) => route.startsWith('GET ') && actions.size > 0)
      .map(([route]) => route)
      .filter((route) => !AUDIT_COVERAGE[route]);
    expect(writingGets).toEqual([]);
  });
});

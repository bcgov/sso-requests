import { AsyncLocalStorage } from 'node:async_hooks';
import type { Actor } from './actor';

// Request-wide audit context: who is acting and which request (Loki `reqId`)
// the work belongs to. Set once at the edge — after authentication in an API
// route, around a cron job or callback — and read by the writer.

export type AuditContext = { actor?: Actor; reqId?: string };

export class MissingAuditActorError extends Error {
  constructor() {
    super('no audit actor in context: wrap the work in withActor() before writing events');
    this.name = 'MissingAuditActorError';
  }
}

// Next may load this module more than once (HMR in dev, separate bundles per
// API route), so keep a single store per process. Otherwise an actor set in one
// module copy would be invisible to another.
const GLOBAL_KEY = Symbol.for('sso-requests.audit-context');
const g = globalThis as unknown as Record<symbol, AsyncLocalStorage<AuditContext> | undefined>;
const store = (g[GLOBAL_KEY] ??= new AsyncLocalStorage<AuditContext>());

/** Runs `fn` with `context` merged over the current audit context, including across awaits. */
export const withAuditContext = <T>(context: AuditContext, fn: () => T): T =>
  store.run({ ...store.getStore(), ...context }, fn);

/** Runs `fn` with `actor` as the actor of every event written inside it. Keeps the current `reqId`. */
export const withActor = <T>(actor: Actor, fn: () => T): T => withAuditContext({ actor }, fn);

/** The actor of the current request or job. Throws rather than falling back to a default. */
export const currentActor = (): Actor => {
  const actor = store.getStore()?.actor;
  if (!actor) throw new MissingAuditActorError();
  return actor;
};

export const currentReqId = (): string | undefined => store.getStore()?.reqId;

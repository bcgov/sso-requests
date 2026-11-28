import { randomInt } from 'node:crypto';

/**
 * Failed attempts after which an optional step is skipped, and ops is told a required step is still failing.
 * Required steps keep retrying past it (see `REQUIRED_STEP_ATTEMPT_LIMIT`).
 */
export const MAX_STEP_ATTEMPTS = Number(process.env.WORKFLOW_MAX_STEP_ATTEMPTS || 5);

/**
 * Hard cap on a required step's attempts. 0, the default, means none: a required step that keeps failing
 * for a transient reason (Keycloak or SDX down) is retried with capped backoff until the dependency recovers.
 * A rejected request (a 4xx that retrying cannot change) still fails the workflow on its first attempt.
 */
export const REQUIRED_STEP_ATTEMPT_LIMIT = Number(process.env.WORKFLOW_REQUIRED_STEP_ATTEMPT_LIMIT || 0);

/**
 * A claim older than this is assumed to belong to a dead pod and is reclaimed by the next worker. A live worker
 * renews it every third of this while a step runs, so it only needs to outlast a few missed renewals, not the
 * step timeout: a pod replaced mid-step by a deploy has its workflow picked up again within about two minutes.
 */
export const CLAIM_LEASE_SECONDS = Number(process.env.WORKFLOW_CLAIM_LEASE_SECONDS || 120);

const BASE_DELAY_MS = Number(process.env.WORKFLOW_RETRY_BASE_DELAY_MS || 2_000);
const MAX_DELAY_MS = Number(process.env.WORKFLOW_RETRY_MAX_DELAY_MS || 120_000);

/** Retries shorter than this are re-armed in-process; anything longer waits for the cron tick. */
export const IN_PROCESS_RETRY_CEILING_MS = Number(process.env.WORKFLOW_IN_PROCESS_RETRY_CEILING_MS || 60_000);

/**
 * Ceiling on a single step. Without it a Keycloak call that never returns keeps the lease alive via the
 * heartbeat forever, so the workflow is never retried, never fails and never dead letters.
 */
export const STEP_TIMEOUT_MS = Number(process.env.WORKFLOW_STEP_TIMEOUT_MS || 300_000);

/**
 * Once a step has failed `MAX_STEP_ATTEMPTS` times it is treated as an outage rather than a blip, and it
 * is retried at this fixed interval until the dependency recovers. Being longer than
 * `IN_PROCESS_RETRY_CEILING_MS`, these retries are picked up by the cron tick, so up to a minute later.
 */
export const SLOW_RETRY_INTERVAL_MS = Number(process.env.WORKFLOW_SLOW_RETRY_INTERVAL_MS || 600_000);

/**
 * Exponential backoff with full jitter for the first `MAX_STEP_ATTEMPTS` attempts, then a fixed
 * `SLOW_RETRY_INTERVAL_MS`. Jitter is what stops every pod that failed against the same Keycloak outage from
 * retrying in lockstep; by the slow phase the workflows' own failure times already keep them apart.
 */
export const backoffDelayMs = (attempt: number): number => {
  if (attempt >= MAX_STEP_ATTEMPTS) return SLOW_RETRY_INTERVAL_MS;
  const exponential = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1));
  // randomInt() is backed by the CSPRNG, so the jitter can't be predicted or biased.
  return randomInt(Math.max(1, Math.floor(exponential)));
};

export const nextRunAfter = (attempt: number): { runAfter: Date; delayMs: number } => {
  const delayMs = backoffDelayMs(attempt);
  return { runAfter: new Date(Date.now() + delayMs), delayMs };
};

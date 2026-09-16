export const MAX_STEP_ATTEMPTS = Number(process.env.WORKFLOW_MAX_STEP_ATTEMPTS || 5);

/** A claim older than this is assumed to belong to a dead pod and is reclaimed by the next worker. */
export const CLAIM_LEASE_SECONDS = Number(process.env.WORKFLOW_CLAIM_LEASE_SECONDS || 1000);

const BASE_DELAY_MS = Number(process.env.WORKFLOW_RETRY_BASE_DELAY_MS || 2_000);
const MAX_DELAY_MS = Number(process.env.WORKFLOW_RETRY_MAX_DELAY_MS || 120_000);

/** Retries shorter than this are re-armed in-process; anything longer waits for the cron tick. */
export const IN_PROCESS_RETRY_CEILING_MS = Number(process.env.WORKFLOW_IN_PROCESS_RETRY_CEILING_MS || 60_000);

/**
 * Exponential backoff with full jitter. Jitter is what stops every pod that failed against the
 * same Keycloak outage from retrying in lockstep and re-creating the stampede.
 */
export const backoffDelayMs = (attempt: number): number => {
  const exponential = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1));
  return Math.floor(Math.random() * exponential);
};

export const nextRunAfter = (attempt: number): { runAfter: Date; delayMs: number } => {
  const delayMs = backoffDelayMs(attempt);
  return { runAfter: new Date(Date.now() + delayMs), delayMs };
};

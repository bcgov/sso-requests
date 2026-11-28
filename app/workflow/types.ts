import { IntegrationData, SDXResourceServer } from '@app/shared/interfaces';
import type { Status } from '@app/interfaces/types';
import { INTEGRATION_BUSY_MESSAGE } from '@app/helpers/transitions';

/**
 * Lifecycle of a workflow instance. Every value is persisted; the orchestrator never keeps workflow
 * state in memory, so a crashed pod resumes from whatever is in Postgres.
 *
 *   QUEUED ──▶ PENDING ──▶ RUNNING ──▶ COMPLETED
 *                             │
 *                             └──▶ FAILED (retries exhausted or permanent error)
 *
 *   QUEUED holds a submission that arrived while another workflow owned the integration. It is never
 *   claimed by a worker; it is promoted to PENDING once the in-flight workflow reaches a terminal state.
 *
 *   Failed steps are never rolled back: work already applied stays applied, and a retry always
 *   resumes from the step that failed.
 *
 *   SUPERSEDED is terminal and set when a newer workflow takes ownership of the same integration
 *   (e.g. a delete issued while an update is still in flight).
 */
export enum WorkflowState {
  QUEUED = 'QUEUED',
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SUPERSEDED = 'SUPERSEDED',
}

/** States that own the integration: the dashboard keeps polling while a workflow is in one of these. */
export const ACTIVE_WORKFLOW_STATES = [WorkflowState.QUEUED, WorkflowState.PENDING, WorkflowState.RUNNING];

/** Only these can be leased by a worker. A QUEUED workflow waits for promotion instead. */
export const CLAIMABLE_WORKFLOW_STATES = [WorkflowState.PENDING, WorkflowState.RUNNING];

export const TERMINAL_WORKFLOW_STATES = [WorkflowState.COMPLETED, WorkflowState.FAILED, WorkflowState.SUPERSEDED];

export enum StepState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum WorkflowType {
  INTEGRATION_APPLY = 'INTEGRATION_APPLY',
  INTEGRATION_DELETE = 'INTEGRATION_DELETE',
  INTEGRATION_RESTORE = 'INTEGRATION_RESTORE',
}

export const STEP_NAMES = {
  PLAN: 'PLAN',
  APPLY_ENVIRONMENT: (env: string) => `APPLY_${env.toUpperCase()}`,
  RESTORE_ROLES: 'RESTORE_ROLES',
  SDX_SUBMIT: 'SDX_SUBMIT',
  NOTIFY: 'NOTIFY',
  FINALIZE: 'FINALIZE',
};

export interface SdxWorkflowRequest {
  id?: number;
  clientId?: string;
  bcscPrivacyZone?: string;
  status?: Status;
}

/**
 * Immutable snapshot the workflow was created with. Persisted as JSONB so a different pod can rebuild
 * the exact same step list on recovery.
 */
export interface WorkflowContext {
  /** True when this workflow is the very first successful apply for the integration. */
  isCreate: boolean;
  restore: boolean;
  addingProd: boolean;
  existingClientId: string;
  sdx?: {
    requesterId: number;
    request: SdxWorkflowRequest;
    revokeAll: boolean;
    resourceServers: SDXResourceServer[];
  };
}

export interface WorkflowRecord {
  id: string;
  correlationId: string;
  requestId: number;
  type: WorkflowType;
  action: string;
  state: WorkflowState;
  payload: IntegrationData;
  context: WorkflowContext;
  attempts: number;
  currentStep: string | null;
  lastError: string | null;
  claimedBy: string | null;
  claimedAt: Date | null;
  runAfter: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStepRecord {
  id: string;
  workflowId: string;
  name: string;
  label: string;
  sequence: number;
  state: StepState;
  attempts: number;
  lastError: string | null;
  result: any;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface StepExecutionContext {
  workflow: WorkflowRecord;
  step: WorkflowStepRecord;
  log: WorkflowLogger;
}

export interface WorkflowStepDefinition {
  name: string;
  label: string;
  /** Must be idempotent: re-running after a partial failure has to converge on the same result. */
  execute: (ctx: StepExecutionContext) => Promise<any>;
  /** Best-effort step: once retries are exhausted it is marked SKIPPED and the workflow carries on. */
  optional?: boolean;
}

export interface WorkflowLogger {
  correlationId: string;
  child: (fields: Record<string, unknown>) => WorkflowLogger;
  info: (message: string, fields?: Record<string, unknown>) => void;
  warn: (message: string, fields?: Record<string, unknown>) => void;
  error: (message: string, fields?: Record<string, unknown>) => void;
  /** Emits a timing metric for a state transition. */
  metric: (name: string, value: number, fields?: Record<string, unknown>) => void;
}

/** Marks a failure the orchestrator must not retry (bad input, business rule violation). */
export class PermanentStepError extends Error {
  readonly permanent = true;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'PermanentStepError';
  }
}

/** Marks a failure worth retrying with backoff (network blip, Keycloak 5xx, lock contention). */
export class TransientStepError extends Error {
  readonly permanent = false;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'TransientStepError';
  }
}

/**
 * Client errors that a retry can still fix: credentials ops can rotate, timeouts and rate limits, and conflicts.
 * A 409 here is a race, not a bad request: two integrations creating the same realm-wide SDX scope, or a retry
 * creating the client an attempt that timed out is still creating. Every step converges, so the next attempt
 * finds what the other created and carries on.
 */
const RETRYABLE_CLIENT_STATUSES = new Set([401, 403, 408, 409, 425, 429]);

/** The HTTP status an error carries: http-errors, axios and the Keycloak admin client each put it elsewhere. */
const httpStatusOf = (err: any): number | undefined => {
  const status = err?.status ?? err?.statusCode ?? err?.response?.status;
  return typeof status === 'number' ? status : undefined;
};

/**
 * A 4xx the dependency would return however often it is retried, because the request itself is wrong. The
 * nearest status in the `cause` chain decides; an error with no status (a network failure) is not one.
 */
export const isRejectedRequest = (err: unknown): boolean => {
  let current: any = err;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const status = httpStatusOf(current);
    if (status !== undefined) return status >= 400 && status < 500 && !RETRYABLE_CLIENT_STATUSES.has(status);
    current = current.cause;
  }
  return false;
};

/**
 * A bug in our own code: reading a property of undefined, calling something that is not a function, a name that
 * does not exist. Only a deploy fixes it, so retrying it every 10 minutes would hold the integration busy for
 * nothing. Node's `fetch` reports a connection failure as a `TypeError` too, always as "fetch failed" with the
 * socket error as its cause, so that one stays retryable. A status nearer in the cause chain decides first.
 */
export const isProgrammingError = (err: unknown): boolean => {
  let current: any = err;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (httpStatusOf(current) !== undefined) return false;
    if (current.name === 'ReferenceError') return true;
    if (current.name === 'TypeError') return current.message !== 'fetch failed' && current.cause === undefined;
    current = current.cause;
  }
  return false;
};

/**
 * Whether retrying cannot help. An explicit `PermanentStepError` or `TransientStepError` decides; anything
 * else is permanent when it is a rejected request or a bug in our code. Required steps retry everything else
 * without limit.
 */
export const isPermanentError = (err: unknown): boolean => {
  const declared = (err as PermanentStepError | TransientStepError)?.permanent;
  if (typeof declared === 'boolean') return declared;
  return isRejectedRequest(err) || isProgrammingError(err);
};

/** Refuses to stop a workflow when the integration has none running, or its running one is already finishing. */
export class WorkflowNotStoppableError extends Error {
  readonly status = 409;
  readonly expose = true;

  constructor(message: string) {
    super(message);
    this.name = 'WorkflowNotStoppableError';
  }
}

/** Refuses a submission while another workflow for the same integration is still active. */
export class IntegrationBusyError extends Error {
  readonly status = 422;
  readonly expose = true;

  constructor() {
    super(INTEGRATION_BUSY_MESSAGE);
    this.name = 'IntegrationBusyError';
  }
}

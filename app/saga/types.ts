import { IntegrationData } from '@app/shared/interfaces';

/**
 * Lifecycle of a saga instance. Every value is persisted; the orchestrator never keeps workflow
 * state in memory, so a crashed pod resumes from whatever is in Postgres.
 *
 *   PENDING ──▶ RUNNING ──▶ COMPLETED
 *                  │
 *                  └──▶ FAILED (retries exhausted or permanent error)
 *
 *   Failed steps are never rolled back: work already applied stays applied, and a retry always
 *   resumes from the step that failed.
 *
 *   SUPERSEDED is terminal and set when a newer saga takes ownership of the same integration
 *   (e.g. a delete issued while an update is still in flight).
 */
export enum SagaState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SUPERSEDED = 'SUPERSEDED',
}

export const ACTIVE_SAGA_STATES = [SagaState.PENDING, SagaState.RUNNING];

export const TERMINAL_SAGA_STATES = [SagaState.COMPLETED, SagaState.FAILED, SagaState.SUPERSEDED];

export enum StepState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum SagaType {
  INTEGRATION_APPLY = 'INTEGRATION_APPLY',
  INTEGRATION_DELETE = 'INTEGRATION_DELETE',
  INTEGRATION_RESTORE = 'INTEGRATION_RESTORE',
}

export const STEP_NAMES = {
  PLAN: 'PLAN',
  APPLY_ENVIRONMENT: (env: string) => `APPLY_${env.toUpperCase()}`,
  RESTORE_ROLES: 'RESTORE_ROLES',
  NOTIFY: 'NOTIFY',
  FINALIZE: 'FINALIZE',
};

/**
 * Immutable snapshot the saga was created with. Persisted as JSONB so a different pod can rebuild
 * the exact same step list on recovery.
 */
export interface SagaContext {
  /** True when this saga is the very first successful apply for the integration. */
  isCreate: boolean;
  restore: boolean;
  addingProd: boolean;
  existingClientId: string;
}

export interface SagaRecord {
  id: string;
  correlationId: string;
  requestId: number;
  type: SagaType;
  action: string;
  state: SagaState;
  payload: IntegrationData;
  context: SagaContext;
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

export interface SagaStepRecord {
  id: string;
  sagaId: string;
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
  saga: SagaRecord;
  step: SagaStepRecord;
  log: SagaLogger;
}

export interface SagaStepDefinition {
  name: string;
  label: string;
  /** Must be idempotent: re-running after a partial failure has to converge on the same result. */
  execute: (ctx: StepExecutionContext) => Promise<any>;
}

export interface SagaLogger {
  correlationId: string;
  child: (fields: Record<string, unknown>) => SagaLogger;
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

export const isPermanentError = (err: unknown): boolean => (err as PermanentStepError)?.permanent === true;

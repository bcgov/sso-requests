export type SagaState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SUPERSEDED';

export type SagaStepState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface IntegrationProgressStep {
  name: string;
  label: string;
  state: SagaStepState;
  attempts: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface IntegrationProgress {
  sagaId: string;
  correlationId: string;
  requestId: number;
  type: string;
  action: string;
  state: SagaState;
  /** True while the workflow is still running, i.e. while the progress tab should be shown. */
  active: boolean;
  failedStep: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  steps: IntegrationProgressStep[];
}

export type RequestWorkflowState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SUPERSEDED';

export type RequestWorkflowStepState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface RequestWorkflowProgressStep {
  name: string;
  label: string;
  state: RequestWorkflowStepState;
  attempts: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface RequestWorkflowProgress {
  workflowId: string;
  correlationId: string;
  requestId: number;
  type: string;
  action: string;
  state: RequestWorkflowState;
  /** True while the workflow is still running, i.e. while the progress tab should be shown. */
  active: boolean;
  failedStep: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  steps: RequestWorkflowProgressStep[];
}

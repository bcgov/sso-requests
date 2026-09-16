import { models } from '@app/shared/sequelize/models/models';
import { EVENTS } from '@app/shared/enums';
import { keycloakClient } from '@app/keycloak/integration';
import { createEvent } from '@app/queries/event';
import { restoreIntegrationRoles, sendRestoreIntegrationEmail, updatePlannedIntegration } from '../effects';
import { WorkflowRecord, WorkflowStepDefinition, WorkflowType, STEP_NAMES, TransientStepError } from '../types';

const ENVIRONMENT_ORDER = ['dev', 'test', 'prod'];

const ENVIRONMENT_LABELS: Record<string, string> = {
  dev: 'Development',
  test: 'Test',
  prod: 'Production',
};

export const orderedEnvironments = (workflow: WorkflowRecord): string[] =>
  ENVIRONMENT_ORDER.filter((env) => (workflow.payload?.environments || []).includes(env));

const setRequestStatus = async (requestId: number, status: string) => {
  await models.request.update({ status }, { where: { id: requestId } });
};

/**
 * Writes an event at most once per workflow. The workflow id is stamped into `details` so a replay after a
 * crash between the insert and the step-state commit does not duplicate the audit trail.
 */
export const emitWorkflowEventOnce = async (workflow: WorkflowRecord, eventCode: string, details: any = {}) => {
  const existing = await models.event.count({
    where: { requestId: workflow.requestId, eventCode, details: { workflowId: workflow.id } },
  });

  if (existing > 0) return;

  await createEvent({
    eventCode,
    requestId: workflow.requestId,
    details: { ...details, workflowId: workflow.id },
  } as any);
};

const applyEnvironmentStep = (workflow: WorkflowRecord, environment: string): WorkflowStepDefinition => {
  const isDelete = workflow.type === WorkflowType.INTEGRATION_DELETE;
  const envLabel = ENVIRONMENT_LABELS[environment] || environment;

  return {
    name: STEP_NAMES.APPLY_ENVIRONMENT(environment),
    label: isDelete ? `Removing ${envLabel} environment` : `Configuring ${envLabel} environment`,

    // `keycloakClient` is a converge-to-desired-state operation (find-or-create for the client,
    // roles, scopes and mappers), so re-running it after a partial failure is safe.
    execute: async ({ log }) => {
      await setRequestStatus(workflow.requestId, 'processing');

      const applied = await keycloakClient(environment, workflow.payload, workflow.context.existingClientId);
      if (!applied) {
        throw new TransientStepError(`Keycloak did not confirm the ${environment} client configuration`);
      }

      log.info('environment applied', { environment });
      return { environment };
    },
  };
};

const planStep = (workflow: WorkflowRecord): WorkflowStepDefinition => ({
  name: STEP_NAMES.PLAN,
  label: 'Request received and validated',
  execute: async () => {
    await setRequestStatus(workflow.requestId, 'planned');
    await emitWorkflowEventOnce(workflow, EVENTS.REQUEST_PLAN_SUCCESS);
    return { planned: true };
  },
});

const restoreRolesStep = (workflow: WorkflowRecord): WorkflowStepDefinition => ({
  name: STEP_NAMES.RESTORE_ROLES,
  label: 'Restoring roles',
  execute: async () => {
    await restoreIntegrationRoles(workflow.requestId);
    return { rolesRestored: true };
  },
});

const finalizeStep = (workflow: WorkflowRecord): WorkflowStepDefinition => ({
  name: STEP_NAMES.FINALIZE,
  label: 'Finalizing integration',
  execute: async () => {
    const isRestore = workflow.type === WorkflowType.INTEGRATION_RESTORE;
    await emitWorkflowEventOnce(workflow, isRestore ? EVENTS.REQUEST_RESTORE_SUCCESS : EVENTS.REQUEST_APPLY_SUCCESS);
    await setRequestStatus(workflow.requestId, 'applied');
    return { finalized: true };
  },
});

const notifyStep = (workflow: WorkflowRecord): WorkflowStepDefinition => ({
  name: STEP_NAMES.NOTIFY,
  label: 'Sending notifications',
  execute: async () => {
    if (workflow.type === WorkflowType.INTEGRATION_RESTORE) {
      await sendRestoreIntegrationEmail(workflow.requestId);
    } else {
      // No-ops for archived integrations; the delete notification is sent at request time.
      await updatePlannedIntegration({ ...workflow.payload }, workflow.context.addingProd);
    }

    return { notified: true };
  },
});

/**
 * Rebuilds the step plan purely from persisted workflow state so any pod can resume a workflow started
 * elsewhere.
 */
export const buildIntegrationWorkflowSteps = (workflow: WorkflowRecord): WorkflowStepDefinition[] => {
  const steps: WorkflowStepDefinition[] = [planStep(workflow)];

  orderedEnvironments(workflow).forEach((environment) => steps.push(applyEnvironmentStep(workflow, environment)));

  if (workflow.type === WorkflowType.INTEGRATION_RESTORE) steps.push(restoreRolesStep(workflow));

  steps.push(finalizeStep(workflow), notifyStep(workflow));

  return steps;
};

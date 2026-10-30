import { models } from '@app/shared/sequelize/models/models';
import { keycloakClient } from '@app/keycloak/integration';
import { recordWorkflowEvent } from '../audit';
import {
  RolesSnapshot,
  restoreIntegrationRoles,
  sendRestoreIntegrationEmail,
  snapshotIntegrationRoles,
  updatePlannedIntegration,
} from '../effects';
import { updateStep } from '../store';
import { WorkflowRecord, WorkflowStepDefinition, WorkflowType, STEP_NAMES, TransientStepError } from '../types';

const ENVIRONMENT_ORDER = ['dev', 'test', 'prod'];

const ENVIRONMENT_LABELS: Record<string, string> = {
  dev: 'Development',
  test: 'Test',
  prod: 'Production',
};

export const orderedEnvironments = (workflow: WorkflowRecord): string[] =>
  // Removal is a no-op where nothing exists, so deletes sweep every environment rather than trusting a
  // snapshot that may not list one a superseded update already created.
  workflow.type === WorkflowType.INTEGRATION_DELETE
    ? ENVIRONMENT_ORDER
    : ENVIRONMENT_ORDER.filter((env) => (workflow.payload?.environments || []).includes(env));

const setRequestStatus = async (requestId: number, status: string) => {
  await models.request.update({ status }, { where: { id: requestId } });
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
    await recordWorkflowEvent(workflow, { outcome: 'success', step: 'request-plan' });
    return { planned: true };
  },
});

const restoreRolesStep = (workflow: WorkflowRecord): WorkflowStepDefinition => ({
  name: STEP_NAMES.RESTORE_ROLES,
  label: 'Restoring roles',
  execute: async ({ step }) => {
    // Taken once, before anything changes, so every attempt measures what it records against the same state.
    let before: RolesSnapshot | undefined = step.result?.rolesBefore;
    if (!before) {
      before = await snapshotIntegrationRoles(workflow.requestId);
      await updateStep(step.id, { result: { rolesBefore: before } });
    }
    await restoreIntegrationRoles(workflow, before);
    return { rolesRestored: true };
  },
});

const finalizeStep = (workflow: WorkflowRecord): WorkflowStepDefinition => ({
  name: STEP_NAMES.FINALIZE,
  label: 'Finalizing integration',
  execute: async () => {
    // The operation's terminal outcome. NOTIFY after it is best effort and cannot change it.
    await recordWorkflowEvent(workflow, { outcome: 'success' });
    await setRequestStatus(workflow.requestId, 'applied');
    return { finalized: true };
  },
});

const notifyStep = (workflow: WorkflowRecord): WorkflowStepDefinition => ({
  name: STEP_NAMES.NOTIFY,
  label: 'Sending notifications',
  // FINALIZE already applied the integration, so an unreachable mail server must not fail the workflow.
  optional: true,
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

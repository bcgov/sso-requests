import { models } from '@app/shared/sequelize/models/models';
import { EVENTS } from '@app/shared/enums';
import { keycloakClient } from '@app/keycloak/integration';
import { createEvent } from '@app/queries/event';
import { restoreIntegrationRoles, sendRestoreIntegrationEmail, updatePlannedIntegration } from '../effects';
import { SagaRecord, SagaStepDefinition, SagaType, STEP_NAMES, TransientStepError } from '../types';

const ENVIRONMENT_ORDER = ['dev', 'test', 'prod'];

const ENVIRONMENT_LABELS: Record<string, string> = {
  dev: 'Development',
  test: 'Test',
  prod: 'Production',
};

export const orderedEnvironments = (saga: SagaRecord): string[] =>
  ENVIRONMENT_ORDER.filter((env) => (saga.payload?.environments || []).includes(env));

const setRequestStatus = async (requestId: number, status: string) => {
  await models.request.update({ status }, { where: { id: requestId } });
};

/**
 * Writes an event at most once per saga. The saga id is stamped into `details` so a replay after a
 * crash between the insert and the step-state commit does not duplicate the audit trail.
 */
export const emitSagaEventOnce = async (saga: SagaRecord, eventCode: string, details: any = {}) => {
  const existing = await models.event.count({
    where: { requestId: saga.requestId, eventCode, details: { sagaId: saga.id } },
  });

  if (existing > 0) return;

  await createEvent({ eventCode, requestId: saga.requestId, details: { ...details, sagaId: saga.id } } as any);
};

const applyEnvironmentStep = (saga: SagaRecord, environment: string): SagaStepDefinition => {
  const isDelete = saga.type === SagaType.INTEGRATION_DELETE;
  const envLabel = ENVIRONMENT_LABELS[environment] || environment;

  return {
    name: STEP_NAMES.APPLY_ENVIRONMENT(environment),
    label: isDelete ? `Removing ${envLabel} environment` : `Configuring ${envLabel} environment`,

    // `keycloakClient` is a converge-to-desired-state operation (find-or-create for the client,
    // roles, scopes and mappers), so re-running it after a partial failure is safe.
    execute: async ({ log }) => {
      await setRequestStatus(saga.requestId, 'processing');

      const applied = await keycloakClient(environment, saga.payload, saga.context.existingClientId);
      if (!applied) {
        throw new TransientStepError(`Keycloak did not confirm the ${environment} client configuration`);
      }

      log.info('environment applied', { environment });
      return { environment };
    },
  };
};

const planStep = (saga: SagaRecord): SagaStepDefinition => ({
  name: STEP_NAMES.PLAN,
  label: 'Request received and validated',
  execute: async () => {
    await setRequestStatus(saga.requestId, 'planned');
    await emitSagaEventOnce(saga, EVENTS.REQUEST_PLAN_SUCCESS);
    return { planned: true };
  },
});

const restoreRolesStep = (saga: SagaRecord): SagaStepDefinition => ({
  name: STEP_NAMES.RESTORE_ROLES,
  label: 'Restoring roles',
  execute: async () => {
    await restoreIntegrationRoles(saga.requestId);
    return { rolesRestored: true };
  },
});

const finalizeStep = (saga: SagaRecord): SagaStepDefinition => ({
  name: STEP_NAMES.FINALIZE,
  label: 'Finalizing integration',
  execute: async () => {
    const isRestore = saga.type === SagaType.INTEGRATION_RESTORE;
    await emitSagaEventOnce(saga, isRestore ? EVENTS.REQUEST_RESTORE_SUCCESS : EVENTS.REQUEST_APPLY_SUCCESS);
    await setRequestStatus(saga.requestId, 'applied');
    return { finalized: true };
  },
});

const notifyStep = (saga: SagaRecord): SagaStepDefinition => ({
  name: STEP_NAMES.NOTIFY,
  label: 'Sending notifications',
  execute: async () => {
    if (saga.type === SagaType.INTEGRATION_RESTORE) {
      await sendRestoreIntegrationEmail(saga.requestId);
    } else {
      // No-ops for archived integrations; the delete notification is sent at request time.
      await updatePlannedIntegration({ ...saga.payload }, saga.context.addingProd);
    }

    return { notified: true };
  },
});

/**
 * Rebuilds the step plan purely from persisted saga state so any pod can resume a workflow started
 * elsewhere.
 */
export const buildIntegrationSagaSteps = (saga: SagaRecord): SagaStepDefinition[] => {
  const steps: SagaStepDefinition[] = [planStep(saga)];

  orderedEnvironments(saga).forEach((environment) => steps.push(applyEnvironmentStep(saga, environment)));

  if (saga.type === SagaType.INTEGRATION_RESTORE) steps.push(restoreRolesStep(saga));

  steps.push(finalizeStep(saga));
  steps.push(notifyStep(saga));

  return steps;
};

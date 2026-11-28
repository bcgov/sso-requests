import type { Permission } from '@sso/authz';
import type { Status } from '@app/interfaces/types';

// A workflow owns the row in every one of these: submitted before it is claimed,
// then planned while it applies.
export const IN_FLIGHT: readonly Status[] = ['submitted', 'planned'];
export const RESTING: readonly Status[] = ['draft', 'applied', 'planFailed', 'applyFailed', 'pr', 'prFailed'];

export const SETTLED: readonly Status[] = ['draft', 'applied'];

export type Intent = 'save' | 'submit' | 'resubmit' | 'deleteDraft' | 'requestDelete';

export interface Transition {
  from: readonly Status[];
  to: Status;
  // Holding any one of these authorizes the transition
  anyOf: readonly Permission[];
}

const APPROVALS: readonly Permission[] = [
  'integrations:approve-bceid',
  'integrations:approve-github',
  'integrations:approve-bcsc',
  'integrations:approve-bcgovidir',
  'integrations:approve-social',
  'integrations:approve-otp',
];

export const TRANSITIONS: Record<Intent, Transition> = {
  save: { from: ['draft'], to: 'draft', anyOf: ['integrations:write'] },
  submit: { from: RESTING, to: 'submitted', anyOf: ['integrations:write', ...APPROVALS] },
  // Resubmit is "retry the workflow" once it has failed, for anyone who could have
  // submitted it. A workflow still in flight is left to the engine's own retries.
  resubmit: {
    from: ['planFailed', 'applyFailed'],
    to: 'submitted',
    anyOf: ['integrations:write', ...APPROVALS],
  },
  // Deleting a draft archives it in place; deleting anything that reached
  // Keycloak is itself a submission, so the clients get torn down.
  deleteDraft: { from: ['draft'], to: 'draft', anyOf: ['integrations:delete'] },
  // An integration in flight cannot be deleted by anyone until its workflow ends.
  requestDelete: {
    from: RESTING.filter((status) => status !== 'draft'),
    to: 'submitted',
    anyOf: ['integrations:delete'],
  },
};

export const INTEGRATION_BUSY_MESSAGE =
  'Another update or deletion of this integration is in progress. Try again once it completes.';
export const INTEGRATION_CHANGED_MESSAGE = 'This integration was changed by another request. Reload it and try again.';

// A refusal the user resolves by waiting or reloading, worth showing as is; anything else keeps a generic message.
export const concurrencyRefusal = (error: unknown): string | null =>
  typeof error === 'string' && [INTEGRATION_BUSY_MESSAGE, INTEGRATION_CHANGED_MESSAGE].includes(error) ? error : null;

export const isInFlight = (status: string | undefined) => IN_FLIGHT.includes(status as Status);
export const isResting = (status: string | undefined) => RESTING.includes(status as Status);
export const isSettled = (status: string | undefined) => SETTLED.includes(status as Status);

// Which delete transition a row in this status is a candidate for.
export const deleteIntentFor = (status: string | undefined): Intent =>
  status === 'draft' ? 'deleteDraft' : 'requestDelete';

export type TransitionRefusal =
  | { reason: 'status'; from: Status }
  | { reason: 'permission'; needs: readonly Permission[] };

// Null when the transition is allowed, otherwise why not — so the server can
// pick a status code and the client can pick whether to draw the button.
export const transitionRefusal = (
  status: string | undefined,
  intent: Intent,
  permissions: readonly string[],
): TransitionRefusal | null => {
  const transition = TRANSITIONS[intent];
  if (!transition.from.includes(status as Status)) return { reason: 'status', from: status as Status };
  if (!transition.anyOf.some((permission) => permissions.includes(permission)))
    return { reason: 'permission', needs: transition.anyOf };
  return null;
};

import type { Permission } from '@sso/authz';
import type { Status } from '@app/interfaces/types';

// A workflow owns the row in every one of these: submitted before it is claimed,
// then planned, processing, and compensating while it rolls back.
export const IN_FLIGHT: readonly Status[] = ['submitted', 'planned', 'processing', 'compensating'];
export const RESTING: readonly Status[] = ['draft', 'applied', 'planFailed', 'applyFailed', 'pr', 'prFailed'];

export const SETTLED: readonly Status[] = ['draft', 'applied'];

export type Intent = 'save' | 'submit' | 'resubmit' | 'deleteDraft' | 'requestDelete' | 'forceDelete';

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
  'integrations:approve-social',
  'integrations:approve-otp',
];

export const TRANSITIONS: Record<Intent, Transition> = {
  save: { from: ['draft'], to: 'draft', anyOf: ['integrations:write'] },
  submit: { from: RESTING, to: 'submitted', anyOf: ['integrations:write', ...APPROVALS] },
  resubmit: { from: ['submitted'], to: 'submitted', anyOf: ['integrations:write'] },
  // Deleting a draft archives it in place; deleting anything that reached
  // Keycloak is itself a submission, so the clients get torn down.
  deleteDraft: { from: ['draft'], to: 'draft', anyOf: ['integrations:delete'] },
  requestDelete: {
    from: RESTING.filter((status) => status !== 'draft'),
    to: 'submitted',
    anyOf: ['integrations:delete'],
  },
  // The admin override, as a row in the table rather than a path around it.
  forceDelete: { from: IN_FLIGHT, to: 'submitted', anyOf: ['integrations:delete-in-flight'] },
};

export const isInFlight = (status: string | undefined) => IN_FLIGHT.includes(status as Status);
export const isResting = (status: string | undefined) => RESTING.includes(status as Status);
export const isSettled = (status: string | undefined) => SETTLED.includes(status as Status);

// Which delete transition a row in this status is a candidate for.
export const deleteIntentFor = (status: string | undefined): Intent => {
  if (status === 'draft') return 'deleteDraft';
  if (isInFlight(status)) return 'forceDelete';
  return 'requestDelete';
};

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

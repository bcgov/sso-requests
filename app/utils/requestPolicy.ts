import { Permission } from '@sso/authz';
import createHttpError from 'http-errors';
import { isEqual, isPlainObject, sortBy } from 'lodash';
import { models } from '@app/shared/sequelize/models/models';
import { IntegrationAccess } from '@app/queries/integrationAccess';
import { Intent, TRANSITIONS, transitionRefusal } from '@app/helpers/transitions';
import { oidcDurationAdditionalFields, samlDurationAdditionalFields } from '@app/schemas';
import { environments } from '@app/utils/constants';
import { restrictedIdpsAdded } from '@app/utils/helpers';

/**
 * What an actor may change on an integration, decided over the diff between
 * the stored row and what they sent, rather than by stripping the payload and
 * reverting the record afterwards. Four rule kinds, kept apart because they
 * answer different questions:
 *
 *   SYSTEM_FIELDS     the system derives these; no permission grants them
 *   FIELD_AUTHORITY   which permission a change to this field needs
 *   VALUE_AUTHORITY   which permission a change *to this value* needs
 *   FIELD_CONSTRAINTS what may not happen to a field once the row has a history
 *
 * Transitions — whether the actor may save, submit or delete the row in its
 * current status at all — are the fifth kind and live in helpers/transitions
 * so the client can read them too.
 */

// Derived by the system, never by the actor. The form round-trips the whole
// record, so a stale copy of one of these in a payload is normal (an autosave
// moved updatedAt, a submit set status) rather than an attempt to change it:
// they are dropped from the diff, not rejected. Nothing here is reachable by
// any permission.
const SYSTEM_FIELDS = new Set([
  'id',
  'userId',
  'idirUserid',
  'idirUserDisplayName',
  'status',
  'archived',
  'serviceType',
  'requester',
  'lastChanges',
  'createdAt',
  'updatedAt',
  'actionNumber',
  'prNumber',
  'apiServiceAccount',
  'provisioned',
  'provisionedAt',
  'hasUnreadNotifications',
  'browserFlowOverride',
  'userTeamRole',
]);

// Not a column, but the SDX request pipeline reads it off the payload, so it
// is the one non-attribute an actor may set. Plain write.
const ACTOR_EXTRAS = ['sdxServices'];

const LIFESPAN_FIELDS = [
  ...oidcDurationAdditionalFields, // AccessTokenLifespan, Session*, OfflineSession*
  ...samlDurationAdditionalFields, // AssertionLifespan
  'OfflineAccessEnabled',
];

const envFields = (fields: string[]) => environments.flatMap((env) => fields.map((field) => `${env}${field}`));

// The permission a change to a field needs. Anything not listed needs
// integrations:write. The env prefix on the approval flags and the lifespans
// is spelled out rather than stripped: it keeps this a plain lookup.
export const FIELD_AUTHORITY: Record<string, Permission> = {
  bceidApproved: 'integrations:approve-bceid',
  devBceidApproved: 'integrations:approve-bceid',
  testBceidApproved: 'integrations:approve-bceid',
  githubApproved: 'integrations:approve-github',
  bcServicesCardApproved: 'integrations:approve-bcsc',
  socialApproved: 'integrations:approve-social',
  otpApproved: 'integrations:approve-otp',

  ...Object.fromEntries(envFields(LIFESPAN_FIELDS).map((field) => [field, 'integrations:write-lifespans'])),
  clientId: 'integrations:write-client-id',

  usesTeam: 'integrations:reassign-team',
  teamId: 'integrations:reassign-team',
};

// Fields where the permission depends on the value: everyone with write may
// change devIdps, but only an admin may add a restricted or discontinued one.
// Returns the extra permission the change needs, or null.
export const VALUE_AUTHORITY: Record<string, (original: any, submitted: any) => Permission | null> = {
  devIdps: (original, submitted) =>
    restrictedIdpsAdded(original ?? [], submitted ?? []).length > 0 ? 'integrations:add-restricted-idps' : null,
};

/**
 * Which fields the actor is actually changing. Only keys present in the
 * payload count, and comparison is tolerant of the shapes a round-trip
 * produces — '' or false for null, '5' for 5, [''] for [], a permuted array — because
 * none of those is a change anyone needs authority for. System fields and
 * unknown keys are ignored.
 */
const normalize = (value: any): any => {
  // Every collapse here is safe only because the value written is canonical
  // too: normalizeRequest sorts and compacts the arrays before the payload is
  // assigned, so a shape the diff calls equal cannot reach the row. The
  // scalars need no such pass — no nullable column in the schema defaults to
  // true, so null and false are read the same way wherever both can be stored.
  if (value === null || value === undefined || value === '' || value === false) return null;
  if (Array.isArray(value)) {
    const items = value.filter((item) => item !== null && item !== undefined && item !== '').map(normalize);
    if (items.length === 0) return null;
    return items.every((item) => typeof item !== 'object') ? sortBy(items) : items;
  }
  if (isPlainObject(value))
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  if (typeof value === 'boolean') return value;
  return String(value);
};

const isActorField = (field: string) =>
  !SYSTEM_FIELDS.has(field) && (field in models.request.rawAttributes || ACTOR_EXTRAS.includes(field));

export const changedFields = (original: Record<string, any>, submitted: Record<string, any>): string[] =>
  Object.keys(submitted).filter(
    (field) => isActorField(field) && !isEqual(normalize(original[field]), normalize(submitted[field])),
  );

// The payload with everything the actor cannot set removed. What is applied
// once the diff is authorized: the whole of it rather than only the changed
// fields, because form validation still expects the client's shapes (a string
// teamId, [''] for no redirect URIs) and an unchanged field keeps whichever
// shape the row already had.
export const actorPayload = (submitted: Record<string, any>): Record<string, any> =>
  Object.fromEntries(Object.entries(submitted).filter(([field]) => isActorField(field)));

const permissionFor = (field: string, original: any, submitted: any): Permission[] => {
  const needed: Permission[] = [FIELD_AUTHORITY[field] ?? 'integrations:write'];
  const byValue = VALUE_AUTHORITY[field]?.(original[field], submitted[field]);
  if (byValue) needed.push(byValue);
  return needed;
};

interface ConstraintContext {
  // The row has been applied (or has failed applying) at least once, so
  // clients may exist in Keycloak for it.
  merged: boolean;
}

// What may not happen to a field once the row has a history. Each returns a
// message naming what was refused, or null.
const FIELD_CONSTRAINTS: Record<
  string,
  (original: Record<string, any>, submitted: Record<string, any>, context: ConstraintContext) => string | null
> = {
  // Environments are validated on every save and append-only once applied:
  // removing one would need the client torn down, which nothing does.
  environments: (original, submitted, { merged }) => {
    const proposed: string[] = submitted.environments ?? [];
    const invalid = proposed.filter((env) => !environments.includes(env as any));
    if (invalid.length) return `environments: ${invalid.join(', ')} is not a valid environment`;
    if (!merged) return null;
    const removed = (original.environments ?? []).filter((env: string) => !proposed.includes(env));
    return removed.length ? `environments: cannot remove ${removed.join(', ')} once the integration is applied` : null;
  },
  // Once an integration has been created for a team it cannot revert to
  // single-person ownership. The other direction is fine: a lead may hand it
  // to a team, and validation already refuses to orphan it (usesTeam false
  // requires projectLead).
  usesTeam: (original, submitted, { merged }) =>
    merged && original.usesTeam && !submitted.usesTeam
      ? 'usesTeam: cannot revert to single-person ownership once the integration is applied'
      : null,
  // BC Services Card registration is filed with the attributes and privacy
  // zone it was approved with.
  bcscAttributes: (original) =>
    original.bcServicesCardApproved ? 'bcscAttributes: cannot change once BC Services Card is approved' : null,
  bcscPrivacyZone: (original) =>
    original.bcServicesCardApproved ? 'bcscPrivacyZone: cannot change once BC Services Card is approved' : null,
};

/**
 * Authorize the actor's changes against their merged permissions over the
 * integration and the row's constraints. Returns the fields that change;
 * throws naming every refused field.
 */
export const authorizeChanges = (
  original: Record<string, any>,
  submitted: Record<string, any>,
  access: IntegrationAccess,
  context: ConstraintContext,
): string[] => {
  const changed = changedFields(original, submitted);

  const denied = changed.filter((field) =>
    permissionFor(field, original, submitted).some((permission) => !access.permissions.includes(permission)),
  );
  if (denied.length) throw new createHttpError.Forbidden(`not allowed to change: ${denied.join(', ')}`);

  const violations = changed
    .map((field) => FIELD_CONSTRAINTS[field]?.(original, submitted, context) ?? null)
    .filter((message): message is string => message !== null);
  if (violations.length) throw new createHttpError.BadRequest(violations.join('; '));

  return changed;
};

/**
 * Whether the actor may move the row through this transition from its current
 * status. Together with authorizeChanges this is the authorization for a
 * lifecycle request: the controller's integrations:read gate only decides
 * whether the row exists for this actor. Throws a 400 when the status does
 * not admit the transition and a 403 when the actor lacks the permission.
 */
export const authorizeTransition = (
  integration: { status: string; archived?: boolean },
  intent: Intent,
  access: IntegrationAccess,
) => {
  const refusal = transitionRefusal(integration.status, intent, access.permissions);
  if (!refusal) return TRANSITIONS[intent];
  if (refusal.reason === 'status')
    throw new createHttpError.BadRequest(`cannot ${intent} an integration in status ${refusal.from}`);
  throw new createHttpError.Forbidden(`not allowed to ${intent} this integration`);
};

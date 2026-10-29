import { Event } from 'interfaces/Event';
import { Outcome } from '@sso/audit';

// How the event panels describe a row. Rows written before @sso/audit have no actor, target or outcome
// columns of their own, so each of these falls back to what those rows did record.

const ACTOR_LABELS: Record<string, string> = {
  user: 'User',
  'service-account': 'API account',
  system: 'System',
};

const TARGET_LABELS: Record<string, string> = {
  user: 'User',
  'service-account': 'Service account',
  'app-user': 'App user',
  role: 'Role',
  team: 'Team',
  integration: 'Integration',
  organization: 'Organization',
};

/** Who did it: a person by name where we have one, otherwise the actor's kind and id. */
export const eventActor = (event: Event): string => {
  if (event.idirUserDisplayName) return event.idirUserDisplayName;
  if (event.actorType && event.actorId) return `${ACTOR_LABELS[event.actorType] || event.actorType}: ${event.actorId}`;
  if (event.idirUserid) return event.idirUserid;
  return event.actorType === 'system' ? ACTOR_LABELS.system : 'Unknown';
};

/** What it was done to, from the target columns or, for older rows, the details that named it. */
export const eventTarget = (event: Event): string | null => {
  if (event.targetType && event.targetId)
    return `${TARGET_LABELS[event.targetType] || event.targetType}: ${event.targetId}`;
  const details = event.details || {};
  if (typeof details.username === 'string') return `${TARGET_LABELS.user}: ${details.username}`;
  if (details.userId !== undefined && details.userId !== null) return `${TARGET_LABELS['app-user']}: ${details.userId}`;
  return null;
};

/** Older rows that never had an outcome recorded one implicitly: they were written once the change was made. */
export const eventOutcome = (event: Event): Outcome => event.outcome ?? 'success';

/** `role-assign` → `Role assign`. */
export const actionLabel = (action: string) => {
  const words = action.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Who an event is attributed to. Resolved once per request (or once per job)
// and carried in the audit context; never passed per event and never defaulted.

export const SYSTEM_ACTOR_IDS = [
  'stale-user-cleanup',
  'user-record-deduplication',
  'sdx-callback',
  // Every run of the workflow engine, whatever started it. The person who asked
  // for the change is the actor on the linked `requested` row.
  'workflow-engine',
] as const;

export type SystemActorId = typeof SYSTEM_ACTOR_IDS[number];

export type UserActor = { type: 'user'; id: string /* idir_userid */; displayName: string };
export type ServiceAccountActor = { type: 'service-account'; id: string /* client id */; teamId?: number };
export type SystemActor = { type: 'system'; id: SystemActorId };

export type Actor = UserActor | ServiceAccountActor | SystemActor;

export type ActorType = Actor['type'];

export const ACTOR_TYPES: readonly ActorType[] = ['user', 'service-account', 'system'];

export const userActor = (id: string, displayName: string): UserActor => {
  if (!id) throw new Error('a user actor needs an idir_userid');
  return { type: 'user', id, displayName };
};

export const serviceAccountActor = (clientId: string, teamId?: number): ServiceAccountActor => {
  if (!clientId) throw new Error('a service account actor needs a client id');
  return teamId === undefined
    ? { type: 'service-account', id: clientId }
    : { type: 'service-account', id: clientId, teamId };
};

export const systemActor = (id: SystemActorId): SystemActor => {
  if (!(SYSTEM_ACTOR_IDS as readonly string[]).includes(id)) throw new Error(`unknown system actor ${id}`);
  return { type: 'system', id };
};

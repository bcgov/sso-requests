import { PERMISSIONS, Permission } from './permissions';

export const permits = (permissions: readonly string[], resource: string, action: string) =>
  permissions.includes(`${resource}:${action}`);

// A grant may not exceed the ceiling its team consented to.
export const isSubset = (proposed: readonly Permission[], ceiling: readonly Permission[]) =>
  proposed.every((permission) => ceiling.includes(permission));

// Effective authority where two sets both bound the answer — a grant against
// the ceiling its team consented to. Intersection is the natural operation:
// two incomparable sets have no meaningful minimum, which is what the level
// ladder this replaced was papering over.
export const intersect = (a: readonly Permission[], b: readonly Permission[]): Permission[] =>
  a.filter((permission) => b.includes(permission));

// Authority from more than one source — team membership and an organization,
// say — is whatever either confers.
export const union = (sets: readonly (readonly Permission[])[]): Permission[] =>
  PERMISSIONS.filter((permission) => sets.some((set) => set.includes(permission)));

// Every stored and derived set is kept in PERMISSIONS order, so two equal sets
// are always deep-equal. presetFor and the database comparisons rely on it.
export const sortPermissions = (permissions: readonly Permission[]): Permission[] =>
  PERMISSIONS.filter((permission) => permissions.includes(permission));

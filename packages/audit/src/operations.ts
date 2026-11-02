import type { AuditOperation } from './writer';
import { roleMappingTarget } from './username';
import type { Environment } from './vocabulary';

// The operations a role change is recorded as. Both the app and the api build
// them here, so the same change produces the same rows whichever path it came
// through: only the actor, ids and timestamps differ.

type RoleScope = { requestId: number; environment: Environment };

type RoleAction = 'role-create' | 'role-update' | 'role-delete' | 'role-composite-update';

/** A change to one client role, targeting that role by name. */
export const roleOperation = <A extends RoleAction>(
  action: A,
  { requestId, environment, roleName }: RoleScope & { roleName: string },
  details: Omit<AuditOperation<A>['details'], 'roleName'> = {} as Omit<AuditOperation<A>['details'], 'roleName'>,
): AuditOperation<A> =>
  ({
    action,
    requestId,
    environment,
    target: { type: 'role', id: roleName },
    details: { roleName, ...details },
  } as AuditOperation<A>);

export type RoleMappingChange = { roleName: string; mode: 'add' | 'remove'; operation: AuditOperation };

/**
 * One `role-assign` / `role-unassign` operation per role granted to or revoked
 * from a user or service account, and the `role-bulk-update` parent that holds
 * them when there is more than one. `clientId` resolves a client id given in
 * place of a username to that client's service account, as the api does.
 */
export const roleMappingOperations = ({
  requestId,
  environment,
  clientId,
  username,
  add = [],
  remove = [],
}: RoleScope & { clientId?: string; username: string; add?: string[]; remove?: string[] }) => {
  const { targetType, targetId } = roleMappingTarget(username, clientId);
  const scope = { requestId, environment, target: { type: targetType, id: targetId } };
  const change =
    (mode: RoleMappingChange['mode']) =>
    (roleName: string): RoleMappingChange => ({
      roleName,
      mode,
      operation: { ...scope, action: mode === 'add' ? 'role-assign' : 'role-unassign', details: { roleName } },
    });

  return {
    parent: { ...scope, action: 'role-bulk-update', details: { add, remove } } as AuditOperation<'role-bulk-update'>,
    changes: [...add.map(change('add')), ...remove.map(change('remove'))],
  };
};

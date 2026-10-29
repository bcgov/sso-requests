export interface RoleChanges {
  add: string[];
  remove: string[];
}

export const diffRoles = (current: string[], next: string[]): RoleChanges => ({
  add: next.filter((role) => !current.includes(role)),
  remove: current.filter((role) => !next.includes(role)),
});

export const hasChanges = ({ add, remove }: RoleChanges) => add.length + remove.length > 0;

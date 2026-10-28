export interface RoleChanges {
  add: string[];
  del: string[];
}

export const diffRoles = (current: string[], next: string[]): RoleChanges => ({
  add: next.filter((role) => !current.includes(role)),
  del: current.filter((role) => !next.includes(role)),
});

// Fires every change in parallel and reports which ones failed, so callers can show the real resulting state.
export const applyRoleChanges = async (
  { add, del }: RoleChanges,
  manageRole: (roleName: string, mode: 'add' | 'del') => Promise<(string[] | null)[]>,
) => {
  const requests: [string, 'add' | 'del'][] = [
    ...add.map((role): [string, 'add' | 'del'] => [role, 'add']),
    ...del.map((role): [string, 'add' | 'del'] => [role, 'del']),
  ];
  const results = await Promise.allSettled(
    requests.map(async ([roleName, mode]) => {
      const [, err] = await manageRole(roleName, mode);
      if (err) throw err;
    }),
  );
  const failed: RoleChanges = { add: [], del: [] };
  results.forEach((result, index) => {
    if (result.status === 'rejected') failed[requests[index][1]].push(requests[index][0]);
  });
  return failed;
};

// Roles the user actually holds: the requested list, with failed removals kept and failed additions dropped.
export const resolveRoles = (requested: string[], failed: RoleChanges) => [
  ...requested.filter((role) => !failed.add.includes(role)),
  ...failed.del,
];

export const hasFailures = ({ add, del }: RoleChanges) => add.length + del.length > 0;

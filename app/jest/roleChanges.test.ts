import { applyRoleChanges, diffRoles, resolveRoles } from '@app/helpers/roles';

describe('role change helpers', () => {
  it('keeps only the role whose removal failed when clearing all roles', async () => {
    const changes = diffRoles(['one', 'two', 'three'], []);
    const manageRole = jest.fn((roleName: string) =>
      Promise.resolve(roleName === 'two' ? [null, new Error('x')] : [[], null]),
    );

    const failed = await applyRoleChanges(changes, manageRole as any);

    expect(manageRole).toHaveBeenCalledTimes(3);
    expect(failed).toEqual({ add: [], del: ['two'] });
    expect(resolveRoles([], failed)).toEqual(['two']);
  });

  it('drops a role from the list when its addition failed', () => {
    expect(resolveRoles(['one', 'two'], { add: ['two'], del: [] })).toEqual(['one']);
  });
});

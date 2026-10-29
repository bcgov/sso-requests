import { roleMappingOperations, roleOperation } from '../src';

describe('roleOperation', () => {
  it('targets the role by name and keeps it in details', () => {
    expect(
      roleOperation('role-composite-update', { requestId: 4, environment: 'dev', roleName: 'admin' }, { add: ['a'] }),
    ).toEqual({
      action: 'role-composite-update',
      requestId: 4,
      environment: 'dev',
      target: { type: 'role', id: 'admin' },
      details: { roleName: 'admin', add: ['a'] },
    });
  });
});

describe('roleMappingOperations', () => {
  it('builds one operation per change, targeting the normalized user', () => {
    const { parent, changes } = roleMappingOperations({
      requestId: 4,
      environment: 'test',
      username: 'ABC@IDIR',
      add: ['a', 'b'],
      remove: ['c'],
    });
    expect(parent).toMatchObject({ action: 'role-bulk-update', details: { add: ['a', 'b'], remove: ['c'] } });
    expect(changes.map(({ roleName, mode, operation }) => [roleName, mode, operation.action])).toEqual([
      ['a', 'add', 'role-assign'],
      ['b', 'add', 'role-assign'],
      ['c', 'remove', 'role-unassign'],
    ]);
    expect(
      changes.every(({ operation }) => operation.target?.id === 'abc@idir' && operation.target.type === 'user'),
    ).toBe(true);
  });

  it('records a client id given as the username against its service account, as either path would', () => {
    const viaClientId = roleMappingOperations({
      requestId: 4,
      environment: 'dev',
      clientId: 'my-app',
      username: 'my-app',
      add: ['a'],
    });
    const viaUsername = roleMappingOperations({
      requestId: 4,
      environment: 'dev',
      username: 'service-account-my-app',
      add: ['a'],
    });
    expect(viaClientId).toEqual(viaUsername);
    expect(viaClientId.changes[0].operation.target).toEqual({ type: 'service-account', id: 'service-account-my-app' });
  });
});

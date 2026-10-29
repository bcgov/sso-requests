import {
  AUDIT_ACTIONS,
  AUDIT_EVENT_COLUMNS,
  LEGACY_AUDIT_ACTIONS,
  OUTCOMES,
  WORKFLOW_ACTIONS,
  describeError,
  isAuditAction,
  normalizeUsername,
  roleMappingTarget,
  serviceAccountActor,
  systemActor,
  toAuditEventRow,
  userActor,
} from '../src';
import { currentActor, currentReqId, withActor, withAuditContext } from '../src/server';

describe('vocabulary', () => {
  it('keeps actions, legacy actions and outcomes disjoint', () => {
    const all = [...AUDIT_ACTIONS, ...LEGACY_AUDIT_ACTIONS];
    expect(new Set(all).size).toBe(all.length);
    for (const action of AUDIT_ACTIONS) {
      for (const outcome of OUTCOMES) expect(action.endsWith(`-${outcome}`)).toBe(false);
    }
  });

  it('only lists current actions as workflow actions', () => {
    expect(WORKFLOW_ACTIONS.every(isAuditAction)).toBe(true);
  });

  it('does not treat a legacy code as a current action', () => {
    expect(isAuditAction('team-admin-removal')).toBe(false);
    expect(isAuditAction('role-assign')).toBe(true);
  });
});

describe('actors', () => {
  it('rejects an unknown system actor', () => {
    expect(() => systemActor('cron' as any)).toThrow('unknown system actor');
  });

  it('requires an id', () => {
    expect(() => userActor('', 'x')).toThrow();
    expect(() => serviceAccountActor('')).toThrow();
  });

  it('records a service account by its client id', () => {
    const row = toAuditEventRow(
      { action: 'role-create', outcome: 'success', details: { roleName: 'r' } },
      serviceAccountActor('service-account-team-1-2', 1),
    );
    expect(row).toMatchObject({ actorType: 'service-account', actorId: 'service-account-team-1-2', idirUserid: null });
  });
});

describe('usernames', () => {
  it('resolves the same person to the same target from either path', () => {
    expect(normalizeUsername(' ABC@IDIR ')).toBe('abc@idir');
    expect(roleMappingTarget('ABC@idir')).toEqual(roleMappingTarget('abc@idir'));
    expect(roleMappingTarget('abc@idir')).toEqual({ targetType: 'user', targetId: 'abc@idir' });
  });

  it('reads a client id as that client service account', () => {
    expect(roleMappingTarget('My-Client', 'my-client')).toEqual({
      targetType: 'service-account',
      targetId: 'service-account-my-client',
    });
    expect(roleMappingTarget('service-account-my-client', 'my-client')).toEqual(
      roleMappingTarget('my-client', 'my-client'),
    );
  });
});

describe('toAuditEventRow', () => {
  it('fills every column the model is checked against', () => {
    const row = toAuditEventRow(
      { action: 'role-assign', outcome: 'success', details: { roleName: 'r' } },
      userActor('U1', 'User'),
    );
    expect(Object.keys(row).sort()).toEqual(Object.keys(AUDIT_EVENT_COLUMNS).sort());
  });

  it('copies details rather than holding the caller object', () => {
    const details = { roleName: 'r' };
    const row = toAuditEventRow({ action: 'role-assign', outcome: 'success', details }, userActor('U1', 'User'));
    expect(row.details).toEqual(details);
    expect(row.details).not.toBe(details);
  });
});

describe('describeError', () => {
  it('keeps the message and status, not the error object', () => {
    const err = Object.assign(new Error('boom'), { response: { status: 404, data: { secret: 's' } } });
    expect(describeError(err)).toEqual({ message: 'boom', status: 404 });
  });

  it('bounds a long message', () => {
    expect(describeError(new Error('x'.repeat(1000))).message).toHaveLength(501);
  });

  it('handles non-errors', () => {
    expect(describeError('plain')).toEqual({ message: 'plain' });
    expect(describeError(undefined)).toEqual({ message: 'undefined' });
  });
});

describe('audit context', () => {
  it('keeps the reqId when the actor is set later in the request', async () => {
    const alice = userActor('A', 'Alice');
    await withAuditContext({ reqId: 'r1' }, async () => {
      await Promise.resolve();
      await withActor(alice, async () => {
        await Promise.resolve();
        expect(currentActor()).toBe(alice);
        expect(currentReqId()).toBe('r1');
      });
    });
  });

  it('does not leak an actor outside its scope', () => {
    withActor(systemActor('workflow-engine'), () => undefined);
    expect(() => currentActor()).toThrow();
  });
});

describe('typed details', () => {
  it('binds details to the action at compile time', () => {
    const actor = userActor('U1', 'User');
    // @ts-expect-error role-assign needs a roleName
    toAuditEventRow({ action: 'role-assign', outcome: 'success', details: {} }, actor);
    // @ts-expect-error team-create details have no roleName
    toAuditEventRow({ action: 'team-create', outcome: 'success', details: { name: 'T', roleName: 'r' } }, actor);
    // @ts-expect-error not an action
    toAuditEventRow({ action: 'team-admin-removal', outcome: 'success', details: {} }, actor);
  });
});

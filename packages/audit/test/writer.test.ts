import {
  AuditEventRow,
  AuditOperation,
  MissingAuditActorError,
  createAuditWriter,
  systemActor,
  userActor,
  withActor,
  withAuditContext,
} from '../src/server';

// An in-memory `event` model whose transactions commit or roll back as a unit.
type Tx = { rows: AuditEventRow[]; mirrors: string[] };

const setup = ({ failCreate }: { failCreate?: (row: AuditEventRow) => boolean } = {}) => {
  const rows: AuditEventRow[] = [];
  const mirrors: string[] = [];
  const errors: { obj: any; msg: string }[] = [];
  let next = 0;
  const writer = createAuditWriter<Tx>({
    model: {
      create: async (row, options) => {
        if (failCreate?.(row)) throw new Error('insert failed');
        (options?.transaction?.rows ?? rows).push(row);
      },
    },
    transaction: async (fn) => {
      const tx: Tx = { rows: [], mirrors: [] };
      const result = await fn(tx);
      rows.push(...tx.rows);
      mirrors.push(...tx.mirrors);
      return result;
    },
    logger: { error: (obj, msg) => errors.push({ obj, msg }) },
    newOperationId: () => `op-${++next}`,
  });
  return { writer, rows, mirrors, errors };
};

const alice = userActor('ALICE01', 'Alice A');

const assign = (roleName: string): AuditOperation => ({
  action: 'role-assign',
  requestId: 7,
  environment: 'dev',
  target: { type: 'user', id: 'abc@idir' },
  details: { roleName },
});

const pick = (rows: AuditEventRow[]) =>
  rows.map(({ eventCode, outcome, operationId, parentOperationId }) => [
    eventCode,
    outcome,
    operationId,
    parentOperationId,
  ]);

describe('createEvent', () => {
  it('attributes the row to the actor and reqId in context', async () => {
    const { writer, rows } = setup();
    await withAuditContext({ reqId: 'req-1' }, () =>
      withActor(alice, () =>
        writer.createEvent({ action: 'team-create', outcome: 'success', teamId: 3, details: { name: 'T' } }),
      ),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        eventCode: 'team-create',
        outcome: 'success',
        teamId: 3,
        actorType: 'user',
        actorId: 'ALICE01',
        idirUserid: 'ALICE01',
        idirUserDisplayName: 'Alice A',
        reqId: 'req-1',
        details: { name: 'T' },
      }),
    ]);
  });

  it('does not fill the idir columns for a system actor', async () => {
    const { writer, rows } = setup();
    await withActor(systemActor('stale-user-cleanup'), () =>
      writer.createEvent({ action: 'user-delete', outcome: 'success', details: {} }),
    );
    expect(rows[0]).toMatchObject({ actorType: 'system', actorId: 'stale-user-cleanup', idirUserid: null });
  });

  it('fails without an actor rather than defaulting to system', async () => {
    const { writer, rows, errors } = setup();
    await expect(
      writer.createEvent({ action: 'team-create', outcome: 'success', details: { name: 'T' } }),
    ).rejects.toBeInstanceOf(MissingAuditActorError);
    expect(rows).toEqual([]);
    expect(errors.map((e) => e.msg)).toEqual(['audit_event_write_failed']);
  });

  it('rethrows and logs a failed insert', async () => {
    const { writer, errors } = setup({ failCreate: () => true });
    await expect(
      withActor(alice, () => writer.createEvent({ action: 'team-create', outcome: 'success', details: { name: 'T' } })),
    ).rejects.toThrow('insert failed');
    expect(errors[0]).toMatchObject({ msg: 'audit_event_write_failed', obj: { eventCode: 'team-create' } });
  });

  it('requires an operation id on anything but a plain success', async () => {
    const { writer } = setup();
    await expect(
      withActor(alice, () => writer.createEvent({ action: 'request-update', outcome: 'requested', details: {} })),
    ).rejects.toThrow('needs an operation id');
  });
});

describe('tryCreateEvent', () => {
  it('swallows a failure after logging it', async () => {
    const { writer, errors } = setup({ failCreate: () => true });
    const ok = await withActor(alice, () =>
      writer.tryCreateEvent({ action: 'team-create', outcome: 'success', details: { name: 'T' } }),
    );
    expect(ok).toBe(false);
    expect(errors).toHaveLength(1);
  });
});

describe('runAuditedOperation', () => {
  it('writes requested, then success with the mirror write in the same transaction', async () => {
    const { writer, rows, mirrors } = setup();
    const result = await withActor(alice, () =>
      writer.runAuditedOperation(assign('viewer'), async () => 'kc-ok', {
        onSuccess: async (tx, value) => {
          tx.mirrors.push(value);
        },
        successDetails: () => ({ extra: 1 }),
      }),
    );
    expect(result).toBe('kc-ok');
    expect(mirrors).toEqual(['kc-ok']);
    expect(pick(rows)).toEqual([
      ['role-assign', 'requested', 'op-1', null],
      ['role-assign', 'success', 'op-1', null],
    ]);
    expect(rows[1]).toMatchObject({
      requestId: 7,
      environment: 'dev',
      targetType: 'user',
      targetId: 'abc@idir',
      details: { roleName: 'viewer', extra: 1 },
    });
  });

  it('keeps an operation id the caller chose', async () => {
    const { writer, rows } = setup();
    await withActor(alice, () =>
      writer.runAuditedOperation({ ...assign('viewer'), operationId: 'mine' }, async () => undefined),
    );
    expect(rows.map((r) => r.operationId)).toEqual(['mine', 'mine']);
  });

  it('never makes the call when requested cannot be stored', async () => {
    const { writer, rows } = setup({ failCreate: (row) => row.outcome === 'requested' });
    const call = jest.fn();
    await expect(withActor(alice, () => writer.runAuditedOperation(assign('viewer'), call))).rejects.toThrow();
    expect(call).not.toHaveBeenCalled();
    expect(rows).toEqual([]);
  });

  it('records a failed call with the error and rethrows it', async () => {
    const { writer, rows } = setup();
    const err = Object.assign(new Error('Keycloak said no'), { response: { status: 409 } });
    await expect(
      withActor(alice, () =>
        writer.runAuditedOperation(assign('viewer'), async () => {
          throw err;
        }),
      ),
    ).rejects.toBe(err);
    expect(pick(rows)).toEqual([
      ['role-assign', 'requested', 'op-1', null],
      ['role-assign', 'failure', 'op-1', null],
    ]);
    expect(rows[1].details).toEqual({ roleName: 'viewer', error: { message: 'Keycloak said no', status: 409 } });
  });

  it('records a local-sync failure when the mirror write fails after the call succeeded', async () => {
    const { writer, rows, mirrors } = setup();
    await expect(
      withActor(alice, () =>
        writer.runAuditedOperation(assign('viewer'), async () => 'kc-ok', {
          onSuccess: async () => {
            throw new Error('mirror failed');
          },
        }),
      ),
    ).rejects.toThrow('mirror failed');
    expect(mirrors).toEqual([]);
    expect(pick(rows)).toEqual([
      ['role-assign', 'requested', 'op-1', null],
      ['role-assign', 'failure', 'op-1', null],
    ]);
    expect(rows[1].details).toMatchObject({ stage: 'local-sync', keycloakApplied: true });
  });

  it('still rethrows the call error when the failure row cannot be written', async () => {
    const { writer, rows, errors } = setup({ failCreate: (row) => row.outcome === 'failure' });
    await expect(
      withActor(alice, () =>
        writer.runAuditedOperation(assign('viewer'), async () => {
          throw new Error('Keycloak down');
        }),
      ),
    ).rejects.toThrow('Keycloak down');
    expect(pick(rows)).toEqual([['role-assign', 'requested', 'op-1', null]]);
    expect(errors.map((e) => e.msg)).toEqual(['audit_event_write_failed']);
  });
});

describe('runAuditedBatch', () => {
  const parent: AuditOperation = {
    action: 'role-bulk-update',
    requestId: 7,
    environment: 'dev',
    target: { type: 'user', id: 'abc@idir' },
    details: { add: ['a', 'b'], remove: [] },
  };

  it('writes no parent for a single change', async () => {
    const { writer, rows } = setup();
    const results = await withActor(alice, () =>
      writer.runAuditedBatch(parent, [{ operation: assign('a'), call: async () => 1 }]),
    );
    expect(results).toEqual([{ operationId: 'op-1', status: 'fulfilled', value: 1 }]);
    expect(pick(rows)).toEqual([
      ['role-assign', 'requested', 'op-1', null],
      ['role-assign', 'success', 'op-1', null],
    ]);
  });

  it('writes nothing for an empty batch', async () => {
    const { writer, rows } = setup();
    expect(await withActor(alice, () => writer.runAuditedBatch(parent, []))).toEqual([]);
    expect(rows).toEqual([]);
  });

  it('stores every requested row before any call, then settles each child and the parent', async () => {
    const { writer, rows } = setup();
    const seenAtFirstCall: AuditEventRow[] = [];
    const results = await withActor(alice, () =>
      writer.runAuditedBatch(parent, [
        {
          operation: assign('a'),
          call: async () => {
            seenAtFirstCall.push(...rows);
            return 'a';
          },
        },
        {
          operation: assign('b'),
          call: async () => {
            throw new Error('b failed');
          },
        },
      ]),
    );
    expect(pick(seenAtFirstCall)).toEqual([
      ['role-bulk-update', 'requested', 'op-1', null],
      ['role-assign', 'requested', 'op-2', 'op-1'],
      ['role-assign', 'requested', 'op-3', 'op-1'],
    ]);
    expect(results.map((r) => [r.operationId, r.status])).toEqual([
      ['op-2', 'fulfilled'],
      ['op-3', 'rejected'],
    ]);
    expect(pick(rows.slice(3))).toEqual([
      ['role-assign', 'success', 'op-2', 'op-1'],
      ['role-assign', 'failure', 'op-3', 'op-1'],
      ['role-bulk-update', 'failure', 'op-1', null],
    ]);
    expect(rows[5].details).toMatchObject({ total: 2, succeeded: 1, failed: 1 });
  });

  it('runs children concurrently when asked, still returning them in item order', async () => {
    const { writer, rows } = setup();
    let inFlight = 0;
    let peak = 0;
    const call = (value: string, ms: number) => async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, ms));
      inFlight -= 1;
      return value;
    };
    const results = await withActor(alice, () =>
      writer.runAuditedBatch(
        parent,
        [
          { operation: assign('a'), call: call('a', 20) },
          { operation: assign('b'), call: call('b', 5) },
          { operation: assign('c'), call: call('c', 5) },
        ],
        { concurrency: 2 },
      ),
    );
    expect(peak).toBe(2);
    expect(results.map((r) => (r.status === 'fulfilled' ? r.value : null))).toEqual(['a', 'b', 'c']);
    expect(rows.filter((r) => r.outcome === 'success' && r.eventCode === 'role-assign')).toHaveLength(3);
  });

  it('writes the parent for one item when asked to', async () => {
    const { writer, rows } = setup();
    await withActor(alice, () =>
      writer.runAuditedBatch(parent, [{ operation: assign('a'), call: async () => 1 }], { parent: 'always' }),
    );
    expect(pick(rows)).toEqual([
      ['role-bulk-update', 'requested', 'op-1', null],
      ['role-assign', 'requested', 'op-2', 'op-1'],
      ['role-assign', 'success', 'op-2', 'op-1'],
      ['role-bulk-update', 'success', 'op-1', null],
    ]);
  });

  it('makes no call when the requested rows cannot be stored', async () => {
    const { writer, rows } = setup({ failCreate: (row) => row.parentOperationId === 'op-1' });
    const call = jest.fn();
    await expect(
      withActor(alice, () =>
        writer.runAuditedBatch(parent, [
          { operation: assign('a'), call },
          { operation: assign('b'), call },
        ]),
      ),
    ).rejects.toThrow();
    expect(call).not.toHaveBeenCalled();
    expect(rows).toEqual([]);
  });

  it('fails a single change when its requested row cannot be stored', async () => {
    const { writer } = setup({ failCreate: () => true });
    const call = jest.fn();
    await expect(
      withActor(alice, () => writer.runAuditedBatch(parent, [{ operation: assign('a'), call }])),
    ).rejects.toThrow();
    expect(call).not.toHaveBeenCalled();
  });
});

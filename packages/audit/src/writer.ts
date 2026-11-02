import { randomUUID } from 'node:crypto';
import { currentActor, currentReqId } from './context';
import { describeError } from './details';
import { AuditEvent, AuditEventRow, toAuditEventRow } from './event';
import type { AuditAction } from './vocabulary';

// The one way events get written. There is deliberately no update or delete:
// an operation's `requested` row and its outcome are separate rows linked by
// `operation_id`, and nothing the application does rewrites either.

export type AuditEventModel<Tx> = {
  create(values: AuditEventRow, options?: { transaction?: Tx }): PromiseLike<unknown>;
};

export type AuditLogger = { error(obj: object, msg: string): void };

export type AuditWriterOptions<Tx> = {
  // Each consumer's own Sequelize `event` model.
  model: AuditEventModel<Tx>;
  // Runs `fn` in a new transaction, e.g. `(fn) => sequelize.transaction(fn)`.
  transaction: <T>(fn: (tx: Tx) => Promise<T>) => PromiseLike<T>;
  logger: AuditLogger;
  newOperationId?: () => string;
};

// An operation as its `requested` row describes it. The writer adds the outcome
// and, unless one is given, the operation id.
export type AuditOperation<A extends AuditAction = AuditAction> = A extends AuditAction
  ? Omit<AuditEvent<A>, 'outcome'>
  : never;

export type AuditedOperationOptions<Tx, T> = {
  // DB writes that mirror the outside change. They commit with the `success`
  // row or not at all.
  onSuccess?: (tx: Tx, result: T) => Promise<unknown>;
  // Merged into the `success` row's details, e.g. ids the outside call returned.
  successDetails?: (result: T) => Record<string, unknown>;
};

export type BatchItem<Tx, T> = AuditedOperationOptions<Tx, T> & {
  operation: AuditOperation;
  call: () => Promise<T>;
};

export type BatchItemResult<T> = { operationId: string } & (
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown }
);

export type BatchOptions = {
  // `multiple` (the default) writes the parent only when there is more than one
  // item, so a single change looks the same whichever path it came through.
  // `always` writes it regardless, for operations that are batches by nature.
  parent?: 'multiple' | 'always';
  // How many children run at once, in order; 1 (the default) runs them one after another.
  concurrency?: number;
};

export const createAuditWriter = <Tx>({
  model,
  transaction,
  logger,
  newOperationId = randomUUID,
}: AuditWriterOptions<Tx>): AuditWriter<Tx> => {
  const logFailure = (err: unknown, event: AuditEvent) =>
    logger.error(
      {
        err,
        eventCode: event.action,
        outcome: event.outcome,
        operationId: event.operationId,
        requestId: event.requestId,
        teamId: event.teamId,
        organizationId: event.organizationId,
      },
      'audit_event_write_failed',
    );

  /**
   * Writes one event, in `tx` when given. Strict: a failure (including a
   * missing actor) is logged and rethrown, so the caller's change fails with it.
   */
  const createEvent = async (event: AuditEvent, tx?: Tx): Promise<void> => {
    try {
      const row = toAuditEventRow(event, currentActor(), currentReqId());
      await model.create(row, tx === undefined ? undefined : { transaction: tx });
    } catch (err) {
      logFailure(err, event);
      throw err;
    }
  };

  /**
   * Writes one event and never throws. Only for an outcome that follows an
   * outside call: by then the change has happened, and the unanswered
   * `requested` row already shows the gap. The log line is what alerts.
   */
  const tryCreateEvent = async (event: AuditEvent): Promise<boolean> => {
    try {
      await createEvent(event);
      return true;
    } catch {
      return false;
    }
  };

  const withOutcome = (
    operation: AuditOperation,
    outcome: AuditEvent['outcome'],
    details: Record<string, unknown> = {},
  ): AuditEvent => ({ ...operation, outcome, details: { ...operation.details, ...details } } as AuditEvent);

  // Steps 3 and 4 of an inline operation, once its `requested` row is stored.
  const settle = async <T>(
    operation: AuditOperation,
    call: () => Promise<T>,
    { onSuccess, successDetails }: AuditedOperationOptions<Tx, T>,
  ): Promise<T> => {
    let result: T;
    try {
      result = await call();
    } catch (err) {
      await tryCreateEvent(withOutcome(operation, 'failure', { error: describeError(err) }));
      throw err;
    }
    try {
      await transaction(async (tx) => {
        if (onSuccess) await onSuccess(tx, result);
        await createEvent(withOutcome(operation, 'success', successDetails?.(result)), tx);
      });
    } catch (err) {
      await tryCreateEvent(
        withOutcome(operation, 'failure', { error: describeError(err), stage: 'local-sync', keycloakApplied: true }),
      );
      throw err;
    }
    return result;
  };

  const withOperationId = (operation: AuditOperation, parentOperationId?: string): AuditOperation =>
    ({
      ...operation,
      operationId: operation.operationId ?? newOperationId(),
      ...(parentOperationId ? { parentOperationId } : {}),
    } as AuditOperation);

  /**
   * An operation against an outside system (Keycloak, SDX):
   *   1. `requested` is stored first, strictly — if it can't be, `call` never runs;
   *   2. `call` runs outside any transaction;
   *   3. on success, `onSuccess` mirror writes and the `success` row commit together;
   *   4. otherwise a best-effort `failure` row, and the error is rethrown.
   */
  const runAuditedOperation = async <T>(
    operation: AuditOperation,
    call: () => Promise<T>,
    options: AuditedOperationOptions<Tx, T> = {},
  ): Promise<T> => {
    const op = withOperationId(operation);
    await transaction((tx) => createEvent(withOutcome(op, 'requested'), tx));
    return settle(op, call, options);
  };

  /**
   * Several operations under one parent. Every child's `requested` row is stored
   * with the parent's before any call is made, so a crash part-way leaves
   * exactly the unfinished children unanswered. Children run in order, up to
   * `concurrency` at a time, and one failing does not stop the rest; the parent
   * ends in `success` only if every child did. Returns each child's result, in
   * item order, rather than throwing.
   */
  const runAuditedBatch = async <T>(
    parent: AuditOperation,
    items: BatchItem<Tx, T>[],
    { parent: parentWhen = 'multiple', concurrency = 1 }: BatchOptions = {},
  ): Promise<BatchItemResult<T>[]> => {
    if (items.length === 0 && parentWhen === 'multiple') return [];

    if (items.length === 1 && parentWhen === 'multiple') {
      const [{ operation, call, ...options }] = items;
      const op = withOperationId(operation);
      // Outside the try: if `requested` can't be stored, the whole call fails.
      await transaction((tx) => createEvent(withOutcome(op, 'requested'), tx));
      try {
        const value = await settle(op, call, options);
        return [{ operationId: op.operationId!, status: 'fulfilled', value }];
      } catch (reason) {
        return [{ operationId: op.operationId!, status: 'rejected', reason }];
      }
    }

    const parentOp = withOperationId(parent);
    const children = items.map((item) => ({
      ...item,
      operation: withOperationId(item.operation, parentOp.operationId),
    }));
    await transaction(async (tx) => {
      await createEvent(withOutcome(parentOp, 'requested'), tx);
      for (const { operation } of children) await createEvent(withOutcome(operation, 'requested'), tx);
    });

    const runChild = async ({ operation, call, ...options }: BatchItem<Tx, T>): Promise<BatchItemResult<T>> => {
      try {
        return {
          operationId: operation.operationId!,
          status: 'fulfilled',
          value: await settle(operation, call, options),
        };
      } catch (reason) {
        return { operationId: operation.operationId!, status: 'rejected', reason };
      }
    };
    const results: BatchItemResult<T>[] = [];
    for (let start = 0; start < children.length; start += Math.max(1, concurrency)) {
      results.push(...(await Promise.all(children.slice(start, start + Math.max(1, concurrency)).map(runChild))));
    }

    const failed = results.filter((r) => r.status === 'rejected').length;
    await tryCreateEvent(
      withOutcome(parentOp, failed > 0 ? 'failure' : 'success', {
        total: results.length,
        succeeded: results.length - failed,
        failed,
      }),
    );
    return results;
  };

  return { createEvent, tryCreateEvent, runAuditedOperation, runAuditedBatch };
};

export type AuditWriter<Tx> = {
  createEvent(event: AuditEvent, tx?: Tx): Promise<void>;
  tryCreateEvent(event: AuditEvent): Promise<boolean>;
  runAuditedOperation<T>(
    operation: AuditOperation,
    call: () => Promise<T>,
    options?: AuditedOperationOptions<Tx, T>,
  ): Promise<T>;
  runAuditedBatch<T>(
    parent: AuditOperation,
    items: BatchItem<Tx, T>[],
    options?: BatchOptions,
  ): Promise<BatchItemResult<T>[]>;
};

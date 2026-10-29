import { models, sequelize } from '@app/shared/sequelize/models/models';
import { Event } from '@app/interfaces/Event';
import { Transaction } from 'sequelize';
import { createAuditWriter } from '@sso/audit/server';

import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'queries/event' });

// The app's audit writer: @sso/audit over the app's `event` model. Every new
// event goes through this; see packages/audit for what each function promises.
export const audit = createAuditWriter<Transaction>({
  model: models.event,
  transaction: (fn) => sequelize.transaction(fn),
  logger: log,
});

// Everything below is the pre-@sso/audit event plumbing. It stays only until
// its call sites move to `audit`, and is removed with the last of them.

const logAuditEventFailure = (err: unknown, data: Event) =>
  log.error(
    {
      err,
      eventCode: data.eventCode,
      requestId: data.requestId,
      teamId: data.teamId,
      organizationId: data.organizationId,
    },
    'audit_event_write_failed',
  );

const withActorDefaults = (data: Event): Event => ({
  ...data,
  actorType: data.actorType ?? (data.idirUserid ? 'user' : 'system'),
  actorId: data.actorId ?? data.idirUserid ?? null,
});

export const createEvent = async (data: Event, transaction?: Transaction) => {
  try {
    const attributes = withActorDefaults(data);
    if (transaction) {
      const event = await models.event.create(attributes, { transaction });
      return event.id as number;
    }
    await models.event.create(attributes);
  } catch (err) {
    logAuditEventFailure(err, data);
    if (transaction) throw err;
  }
};

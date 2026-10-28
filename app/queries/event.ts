import { models } from '@app/shared/sequelize/models/models';
import { Event } from '@app/interfaces/Event';
import { Transaction } from 'sequelize';

import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'queries/event' });

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

export const beginLifecycleEvent = async (data: Event): Promise<number | undefined> => {
  try {
    const event = await models.event.create(withActorDefaults(data));
    return event.id;
  } catch (err) {
    logAuditEventFailure(err, data);
    return undefined;
  }
};

export const completeLifecycleEvent = async (
  eventId: number | undefined,
  data: Pick<Event, 'eventCode' | 'details' | 'requestId' | 'teamId' | 'organizationId'> &
    Partial<Pick<Event, 'workflowId'>>,
) => {
  if (eventId === undefined) return;
  try {
    await models.event.update(
      {
        eventCode: data.eventCode,
        details: data.details,
        ...(data.workflowId !== undefined ? { workflowId: data.workflowId } : {}),
      },
      { where: { id: eventId } },
    );
  } catch (err) {
    logAuditEventFailure(err, data);
  }
};

export const runAuditedOperation = async <T>(
  requestedEvent: Event,
  successEventCode: string,
  failureEventCode: string,
  operation: () => Promise<T>,
  getCompletionDetails?: () => any,
): Promise<T> => {
  return runAuditedOperations(
    [{ requestedEvent, successEventCode, failureEventCode }],
    operation,
    getCompletionDetails,
  );
};

export const runAuditedOperations = async <T>(
  events: {
    requestedEvent: Event;
    successEventCode: string;
    failureEventCode: string;
  }[],
  operation: () => Promise<T>,
  // Lets the operation enrich the event details once its outcome is known.
  getCompletionDetails?: () => any,
): Promise<T> => {
  const eventIds = await Promise.all(events.map(({ requestedEvent }) => beginLifecycleEvent(requestedEvent)));
  try {
    const result = await operation();
    await Promise.all(
      events.map(({ requestedEvent, successEventCode }, index) =>
        completeLifecycleEvent(eventIds[index], {
          eventCode: successEventCode,
          details: getCompletionDetails ? getCompletionDetails() : requestedEvent.details,
          requestId: requestedEvent.requestId,
          teamId: requestedEvent.teamId,
          organizationId: requestedEvent.organizationId,
        }),
      ),
    );
    return result;
  } catch (err) {
    await Promise.all(
      events.map(({ requestedEvent, failureEventCode }, index) =>
        completeLifecycleEvent(eventIds[index], {
          eventCode: failureEventCode,
          details: getCompletionDetails ? getCompletionDetails() : requestedEvent.details,
          requestId: requestedEvent.requestId,
          teamId: requestedEvent.teamId,
          organizationId: requestedEvent.organizationId,
        }),
      ),
    );
    throw err;
  }
};

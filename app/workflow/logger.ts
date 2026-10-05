import { logger, Logger } from '@app/utils/logger';
import { WorkflowLogger } from './types';

const workflowLog = logger.child({ module: 'request-workflow' });

const wrap = (log: Logger, correlationId: string): WorkflowLogger => ({
  correlationId,
  child: (fields) => wrap(log.child(fields), correlationId),
  info: (message, fields) => log.info(fields ?? {}, message),
  warn: (message, fields) => log.warn(fields ?? {}, message),
  error: (message, fields) => log.error(fields ?? {}, message),
  metric: (name, value, fields) => log.info({ ...fields, metric: name, value, unit: 'ms' }, `metric.${name}`),
});

/**
 * Structured logger that carries the correlation id (and any other workflow identifiers) across every
 * async boundary. Always create a child logger when entering a step so log lines can be joined
 * back into a single workflow trace.
 */
export const createWorkflowLogger = (base: Record<string, unknown> & { correlationId: string }): WorkflowLogger =>
  wrap(workflowLog.child(base), base.correlationId);

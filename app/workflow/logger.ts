import { WorkflowLogger } from './types';

const SERVICE = 'request-workflow';

const emit = (level: 'info' | 'warn' | 'error', fields: Record<string, unknown>, message: string) => {
  const entry = JSON.stringify({
    level,
    service: SERVICE,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  });

  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
};

/**
 * Structured logger that carries the correlation id (and any other workflow identifiers) across every
 * async boundary. Always create a child logger when entering a step so log lines can be joined
 * back into a single workflow trace.
 */
export const createWorkflowLogger = (base: Record<string, unknown> & { correlationId: string }): WorkflowLogger => ({
  correlationId: base.correlationId,
  child: (fields) => createWorkflowLogger({ ...base, ...fields } as any),
  info: (message, fields) => emit('info', { ...base, ...fields }, message),
  warn: (message, fields) => emit('warn', { ...base, ...fields }, message),
  error: (message, fields) => emit('error', { ...base, ...fields }, message),
  metric: (name, value, fields) =>
    emit('info', { ...base, ...fields, metric: name, value, unit: 'ms' }, `metric.${name}`),
});

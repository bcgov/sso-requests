import type { ChatCompletionChunk, StreamError } from './types';

export const DONE_SENTINEL = '[DONE]';

export type SseEvent =
  | { type: 'done' }
  | { type: 'chunk'; chunk: ChatCompletionChunk }
  | { type: 'error'; error: string };

/** Parses one SSE line from the /chat stream. Comments (keepalives), blank and malformed lines give null. */
export function parseSseLine(line: string): SseEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;

  const data = trimmed.replace(/^data:\s*/, '');
  if (data === DONE_SENTINEL) return { type: 'done' };
  if (!data) return null;

  try {
    const parsed = JSON.parse(data) as ChatCompletionChunk | StreamError;
    if ('error' in parsed) return { type: 'error', error: parsed.error };
    if (Array.isArray(parsed?.choices)) return { type: 'chunk', chunk: parsed };
    return null;
  } catch {
    return null;
  }
}

/** Splits streamed text into complete lines, keeping the unfinished tail for the next read. */
export function splitSseBuffer(buffer: string): { lines: string[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  return { lines, rest };
}

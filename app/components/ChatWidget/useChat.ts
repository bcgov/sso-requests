import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthHeader } from '@app/services/auth';
import { createTypewriter, type Typewriter } from '@app/utils/chat/typewriter';
import { parseSseLine, splitSseBuffer } from '@app/utils/chat/sse';
import { clearHistory, loadHistory, saveHistory } from '@app/utils/chat/history';
import type { ChatMessage, Citation, GroundingStatus } from '@app/utils/chat/types';

// Same-origin proxy routes (pages/api/chat), for signed-in users only. The proxy keeps the conversation under an
// HttpOnly cookie plus this tab's id, so it stays separate per tab; the messages on screen are kept in sessionStorage
// under the same tab id (utils/chat/history.ts), so a page refresh restores them.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
export const CHAT_URL = `${API_URL}/chat`;
export const CHAT_HISTORY_URL = `${API_URL}/chat/history`;
export const CHAT_STATUS_URL = `${API_URL}/chat/status`;

const TAB_ID_HEADER = 'X-Tab-Id';
const TAB_ID_KEY = 'css-assistant-tab-id';
const GENERIC_ERROR = 'The assistant failed to respond. Please try again.';

const newId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// sessionStorage is per tab and survives reloads, so each tab keeps its own conversation.
const getTabId = (): string => {
  let tabId = sessionStorage.getItem(TAB_ID_KEY);
  if (!tabId) {
    tabId = newId();
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  }
  return tabId;
};

const rotateTabId = () => sessionStorage.setItem(TAB_ID_KEY, newId());

/** The proxy answers errors with `{ message }`; a 429 also says when the caller may try again. */
export const responseErrorMessage = async (response: Response): Promise<string> => {
  let message: string | undefined;
  try {
    const body = await response.json();
    if (typeof body?.message === 'string') message = body.message;
  } catch {
    // Not JSON; fall back below.
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      const minutes = Math.max(1, Math.ceil(retryAfter / 60));
      return `You have reached the message limit for the assistant. Please try again in about ${minutes} minute${
        minutes === 1 ? '' : 's'
      }.`;
    }
  }
  return message || GENERIC_ERROR;
};

/** `owner`: the signed-in user, whose conversation in this tab is restored after a page refresh. */
export function useChat(owner: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typewriterRef = useRef<Typewriter | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // The user whose stored conversation has been loaded; nothing is saved before that, so the empty initial state
  // can't overwrite it. Declared before the restore effect so it runs first on mount.
  const restoredFor = useRef<string | null>(null);

  useEffect(() => {
    if (restoredFor.current === owner) saveHistory(getTabId(), owner, messages);
  }, [messages, owner]);

  useEffect(() => {
    setMessages(loadHistory(getTabId(), owner));
    restoredFor.current = owner;
  }, [owner]);

  // Stops the in-flight answer, if any; the proxy cancels the upstream run when the request is aborted.
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    typewriterRef.current?.cancel();
  }, []);

  useEffect(() => stopStreaming, [stopStreaming]);

  const sendMessage = useCallback(async (prompt: string) => {
    if (abortRef.current) return;
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    const assistantId = newId();
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: 'user', content: prompt },
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ]);
    setIsStreaming(true);

    const updateAssistant = (patch: Partial<ChatMessage>) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)));

    // Received text is revealed smoothly, one animation frame at a time.
    const typewriter = createTypewriter((visible) => updateAssistant({ content: visible }));
    typewriterRef.current = typewriter;
    const citations: Citation[] = [];
    let grounding: GroundingStatus | undefined;

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: await getAuthHeader(),
          [TAB_ID_HEADER]: getTabId(),
        },
        credentials: 'include',
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(await responseErrorMessage(response));
      if (!response.body) throw new Error(GENERIC_ERROR);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        const split = splitSseBuffer(buffer + decoder.decode(value, { stream: true }));
        buffer = split.rest;

        for (const line of split.lines) {
          const event = parseSseLine(line);
          if (!event) continue;
          if (event.type === 'done') {
            done = true;
            break;
          }
          // The status is already 200 once streaming starts, so failures are reported in-band.
          if (event.type === 'error') throw new Error(event.error);

          const choice = event.chunk.choices[0];
          if (!choice) continue;
          if (choice.finish_reason === 'stop') {
            done = true;
            break;
          }

          const { content, citations: newCitations, status, grounding_status: groundingStatus } = choice.delta;
          if (status) updateAssistant({ status });
          if (content) typewriter.push(content);
          if (newCitations) citations.push(...newCitations);
          if (groundingStatus) grounding = groundingStatus;
        }
      }

      reader.cancel().catch(() => undefined);

      // Let the remaining text finish revealing before showing the sources.
      await typewriter.finish();
      updateAssistant({
        streaming: false,
        status: undefined,
        groundingStatus: grounding,
        citations: citations.length ? citations : undefined,
      });
    } catch (err) {
      typewriter.cancel();
      // Stopped on purpose (new chat / delete history): the messages are already gone.
      if (controller.signal.aborted) return;
      setError(err instanceof Error && err.message ? err.message : GENERIC_ERROR);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      if (typewriterRef.current === typewriter) typewriterRef.current = null;
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsStreaming(false);
      }
    }
  }, []);

  /** Starts a new conversation in this tab. */
  const clearMessages = useCallback(async () => {
    // Switch to a new tab id first, so a message sent while the delete below is in flight starts the new
    // conversation, and so the next message starts fresh even if the delete fails.
    const tabId = getTabId();
    rotateTabId();
    clearHistory(tabId);
    stopStreaming();
    setIsStreaming(false);
    setMessages([]);
    setError(null);

    // Delete the old conversation's stored history.
    try {
      await fetch(CHAT_URL, {
        method: 'DELETE',
        headers: { Authorization: await getAuthHeader(), [TAB_ID_HEADER]: tabId },
        credentials: 'include',
      });
    } catch {
      // Not fatal: the new tab id already starts a new conversation.
    }
  }, [stopStreaming]);

  /**
   * Permanently deletes this browser's stored history (every tab's conversation). Throws if the server couldn't
   * delete it, leaving the conversation on screen so the user can retry.
   */
  const deleteHistory = useCallback(async () => {
    // Stop any answer first: upstream saves a conversation when its turn ends, which would write it back after
    // the delete.
    stopStreaming();
    setIsStreaming(false);
    setMessages((prev) => prev.filter((m) => !m.streaming));

    const response = await fetch(CHAT_HISTORY_URL, {
      method: 'DELETE',
      headers: { Authorization: await getAuthHeader() },
      credentials: 'include',
    });
    if (!response.ok) throw new Error(await responseErrorMessage(response));

    setMessages([]);
    setError(null);
    clearHistory(getTabId());
    rotateTabId();
  }, [stopStreaming]);

  return { messages, isStreaming, error, sendMessage, clearMessages, deleteHistory };
}

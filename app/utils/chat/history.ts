import type { ChatMessage, Citation } from './types';

// The conversation shown in the chat window, kept per tab so a page refresh restores it. sessionStorage lasts as long
// as the tab, like the tab id the RAG API keys this conversation by, and is never shared with other tabs.
const HISTORY_KEY_PREFIX = 'css-assistant-history:';
// Enough to scroll back through a long conversation without approaching the storage quota.
export const MAX_STORED_MESSAGES = 50;

interface StoredHistory {
  /** The signed-in user the conversation belongs to. */
  owner: string;
  messages: ChatMessage[];
}

const historyKey = (tabId: string) => `${HISTORY_KEY_PREFIX}${tabId}`;

const isHttpUrl = (value: unknown): value is string => typeof value === 'string' && /^https?:\/\//i.test(value);

// Stored data is read back from the browser, so only well-formed messages are restored.
const toCitation = (value: any): Citation | null => {
  if (!value || typeof value !== 'object') return null;
  const title = typeof value.title === 'string' ? value.title : undefined;
  const uri = isHttpUrl(value.location?.uri) ? value.location.uri : undefined;
  if (!title && !uri) return null;
  return { title, location: uri ? { uri } : undefined };
};

const toMessage = (value: any): ChatMessage | null => {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.id !== 'string' || typeof value.content !== 'string') return null;
  if (value.role !== 'user' && value.role !== 'assistant') return null;

  const message: ChatMessage = { id: value.id, role: value.role, content: value.content };
  if (value.role === 'assistant') {
    if (['SUPPORTED', 'PARTIALLY_SUPPORTED', 'NOT_SUPPORTED'].includes(value.groundingStatus)) {
      message.groundingStatus = value.groundingStatus;
    }
    const citations = Array.isArray(value.citations)
      ? value.citations.map(toCitation).filter((c: Citation | null): c is Citation => c !== null)
      : [];
    if (citations.length) message.citations = citations;
  }
  return message;
};

/** The stored conversation for this tab, if it belongs to `owner`; anyone else's is discarded. */
export function loadHistory(tabId: string, owner: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(historyKey(tabId));
    if (!raw) return [];
    const stored = JSON.parse(raw) as Partial<StoredHistory>;
    if (stored?.owner !== owner || !Array.isArray(stored.messages)) {
      sessionStorage.removeItem(historyKey(tabId));
      return [];
    }
    return stored.messages.map(toMessage).filter((m): m is ChatMessage => m !== null);
  } catch {
    return [];
  }
}

/**
 * Stores the finished part of the conversation. An answer still streaming is left out together with its question:
 * the RAG API only saves a turn once it completes, so after a refresh neither is part of the conversation.
 */
export function saveHistory(tabId: string, owner: string, messages: ChatMessage[]) {
  const streamingAt = messages.findIndex((m) => m.streaming);
  const finished = streamingAt < 0 ? messages : messages.slice(0, Math.max(streamingAt - 1, 0));
  const kept = finished.slice(-MAX_STORED_MESSAGES).map(({ streaming: _streaming, status: _status, ...m }) => m);

  try {
    if (kept.length === 0) {
      sessionStorage.removeItem(historyKey(tabId));
      return;
    }
    const stored: StoredHistory = { owner, messages: kept };
    sessionStorage.setItem(historyKey(tabId), JSON.stringify(stored));
  } catch {
    // Storage full or unavailable: the conversation still works, it just won't survive a refresh.
  }
}

export function clearHistory(tabId: string) {
  try {
    sessionStorage.removeItem(historyKey(tabId));
  } catch {
    // Nothing to clear.
  }
}

import { parseSseLine, splitSseBuffer } from '@app/utils/chat/sse';
import { stabilizeStreamingMarkdown } from '@app/utils/chat/markdown';
import { clearHistory, loadHistory, MAX_STORED_MESSAGES, saveHistory } from '@app/utils/chat/history';
import { positiveInt } from '@app/utils/chat-proxy';
import type { ChatMessage } from '@app/utils/chat/types';

describe('chat history in sessionStorage', () => {
  const TAB = 'tab-1';
  const question: ChatMessage = { id: 'q1', role: 'user', content: 'How do I start?' };
  const answer: ChatMessage = {
    id: 'a1',
    role: 'assistant',
    content: 'Use the **standard** realm.',
    groundingStatus: 'SUPPORTED',
    citations: [{ title: 'Getting started', location: { uri: 'https://docs.example/start' } }],
  };

  beforeEach(() => sessionStorage.clear());

  it('restores what was saved for the same tab and user', () => {
    saveHistory(TAB, 'user-1', [question, answer]);
    expect(loadHistory(TAB, 'user-1')).toEqual([question, answer]);
    expect(loadHistory('another-tab', 'user-1')).toEqual([]);
  });

  it("discards another user's conversation", () => {
    saveHistory(TAB, 'user-1', [question, answer]);
    expect(loadHistory(TAB, 'user-2')).toEqual([]);
    // Gone for good, not just hidden.
    expect(loadHistory(TAB, 'user-1')).toEqual([]);
  });

  it('leaves out an answer still streaming, and its question', () => {
    const pending: ChatMessage = { id: 'q2', role: 'user', content: 'And then?' };
    const streaming: ChatMessage = { id: 'a2', role: 'assistant', content: 'Par', streaming: true, status: 'writing' };
    saveHistory(TAB, 'user-1', [question, answer, pending, streaming]);
    expect(loadHistory(TAB, 'user-1')).toEqual([question, answer]);
  });

  it('keeps only the most recent messages', () => {
    const many = Array.from({ length: MAX_STORED_MESSAGES + 10 }, (_, i) => ({
      id: `m${i}`,
      role: (i % 2 ? 'assistant' : 'user') as ChatMessage['role'],
      content: `message ${i}`,
    }));
    saveHistory(TAB, 'user-1', many);
    const restored = loadHistory(TAB, 'user-1');
    expect(restored).toHaveLength(MAX_STORED_MESSAGES);
    expect(restored[restored.length - 1].content).toBe(`message ${MAX_STORED_MESSAGES + 9}`);
  });

  it('ignores malformed or tampered entries', () => {
    sessionStorage.setItem(
      `css-assistant-history:${TAB}`,
      JSON.stringify({
        owner: 'user-1',
        messages: [
          question,
          { id: 'x', role: 'system', content: 'nope' },
          { id: 'y', role: 'assistant' },
          { ...answer, citations: [{ title: 'Bad', location: { uri: 'javascript:alert(1)' } }] },
        ],
      }),
    );
    expect(loadHistory(TAB, 'user-1')).toEqual([
      question,
      { ...answer, citations: [{ title: 'Bad', location: undefined }] },
    ]);

    sessionStorage.setItem(`css-assistant-history:${TAB}`, '{not json');
    expect(loadHistory(TAB, 'user-1')).toEqual([]);
  });

  it('clears the stored conversation, including when it is saved empty', () => {
    saveHistory(TAB, 'user-1', [question, answer]);
    clearHistory(TAB);
    expect(sessionStorage.getItem(`css-assistant-history:${TAB}`)).toBeNull();

    saveHistory(TAB, 'user-1', [question, answer]);
    saveHistory(TAB, 'user-1', []);
    expect(sessionStorage.getItem(`css-assistant-history:${TAB}`)).toBeNull();
  });
});

describe('positiveInt', () => {
  it('reads plain positive integers', () => {
    expect(positiveInt('3600000', 1)).toBe(3600000);
    expect(positiveInt(' 10 ', 1)).toBe(10);
  });

  it('falls back for anything else, including how Helm renders large unquoted numbers', () => {
    expect(positiveInt('3.6e+06', 42)).toBe(42);
    expect(positiveInt('10abc', 42)).toBe(42);
    expect(positiveInt('0', 42)).toBe(42);
    expect(positiveInt('-5', 42)).toBe(42);
    expect(positiveInt(undefined, 42)).toBe(42);
  });
});

describe('parseSseLine', () => {
  it('parses chunks, errors and the done sentinel', () => {
    const chunk = { id: 'c', object: 'chat.completion.chunk', created: 0, model: 'm', choices: [] };
    expect(parseSseLine(`data: ${JSON.stringify(chunk)}`)).toEqual({ type: 'chunk', chunk });
    expect(parseSseLine('data: {"error":"Boom"}')).toEqual({ type: 'error', error: 'Boom' });
    expect(parseSseLine('data: [DONE]')).toEqual({ type: 'done' });
  });

  it('ignores keepalive comments, blank and malformed lines', () => {
    expect(parseSseLine(': keepalive')).toBeNull();
    expect(parseSseLine('')).toBeNull();
    expect(parseSseLine('data: {not json')).toBeNull();
    expect(parseSseLine('data: {"something":"else"}')).toBeNull();
  });
});

describe('splitSseBuffer', () => {
  it('keeps the unfinished tail', () => {
    expect(splitSseBuffer('data: a\n\ndata: b')).toEqual({ lines: ['data: a', ''], rest: 'data: b' });
  });
});

describe('stabilizeStreamingMarkdown', () => {
  it('shows an unfinished link as its label', () => {
    expect(stabilizeStreamingMarkdown('See [Getting started](https://docs')).toBe('See Getting started');
  });

  it('closes open emphasis and code', () => {
    expect(stabilizeStreamingMarkdown('a **bold')).toBe('a **bold**');
    expect(stabilizeStreamingMarkdown('an *italic')).toBe('an *italic*');
    expect(stabilizeStreamingMarkdown('run `yarn')).toBe('run `yarn`');
    expect(stabilizeStreamingMarkdown('```\ncode')).toBe('```\ncode\n```');
  });

  it('drops markers with no text after them yet', () => {
    expect(stabilizeStreamingMarkdown('text **')).toBe('text ');
    expect(stabilizeStreamingMarkdown('text `')).toBe('text ');
  });

  it('leaves complete Markdown alone', () => {
    const text = 'A **b** and *c* with `d` and [e](https://f).';
    expect(stabilizeStreamingMarkdown(text)).toBe(text);
  });
});

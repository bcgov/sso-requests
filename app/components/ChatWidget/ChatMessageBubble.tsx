import { memo } from 'react';
import styled from 'styled-components';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SECONDARY_BLUE } from '@app/styles/theme';
import { stabilizeStreamingMarkdown } from '@app/utils/chat/markdown';
import type { ChatMessage, Citation, ProgressStatus } from '@app/utils/chat/types';

const PROGRESS_LABELS: Record<ProgressStatus | 'thinking', string> = {
  thinking: 'Thinking…',
  searching: 'Searching the documentation…',
  // The answer is verified against the sources before it is sent.
  writing: 'Checking sources…',
};

// Answers link to the documentation; open those outside the app.
const markdownComponents: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  table: ({ node: _node, ...props }) => (
    <div className="table-scroll">
      <table {...props} />
    </div>
  ),
};

const SRow = styled.div<{ $isUser: boolean }>`
  display: flex;
  width: 100%;
  justify-content: ${(props) => (props.$isUser ? 'flex-end' : 'flex-start')};
`;

const SBubble = styled.div<{ $isUser: boolean }>`
  max-width: 85%;
  padding: 0.6rem 0.85rem;
  border-radius: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  background-color: ${(props) => (props.$isUser ? SECONDARY_BLUE : '#f2f2f2')};
  color: ${(props) => (props.$isUser ? '#fff' : '#313132')};
  border-bottom-right-radius: ${(props) => (props.$isUser ? '0.2rem' : '0.75rem')};
  border-bottom-left-radius: ${(props) => (props.$isUser ? '0.75rem' : '0.2rem')};

  .user-text {
    white-space: pre-wrap;
    margin: 0;
  }

  .markdown {
    p,
    ul,
    ol,
    pre,
    blockquote {
      margin: 0 0 0.5rem 0;
    }
    > :last-child {
      margin-bottom: 0;
    }
    ul,
    ol {
      padding-left: 1.25rem;
    }
    h1,
    h2,
    h3,
    h4 {
      font-size: 1rem;
      font-weight: bold;
      margin: 0.5rem 0;
    }
    code {
      font-size: 0.85em;
      background-color: rgba(0, 0, 0, 0.06);
      padding: 0.1em 0.3em;
      border-radius: 0.2rem;
    }
    pre {
      background-color: rgba(0, 0, 0, 0.06);
      padding: 0.5rem;
      border-radius: 0.3rem;
      overflow-x: auto;
      code {
        background: none;
        padding: 0;
      }
    }
    .table-scroll {
      overflow-x: auto;
      margin-bottom: 0.5rem;
    }
    table {
      border-collapse: collapse;
      font-size: 0.85em;
      th,
      td {
        border: 1px solid #ccc;
        padding: 0.2rem 0.4rem;
      }
    }
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: #606060;
  }

  .spinner {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    border: 2px solid #ccc;
    border-top-color: #606060;
    border-radius: 50%;
    animation: chat-spin 0.8s linear infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

  .cursor {
    display: inline-block;
    width: 0.45rem;
    height: 0.9rem;
    margin-left: 0.2rem;
    vertical-align: middle;
    background-color: currentColor;
    opacity: 0.6;
  }

  .partial-note {
    margin: 0.6rem 0 0 0;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
    color: #6c4a00;
    background-color: #fef1d8;
    border: 1px solid #f8bb47;
    border-radius: 0.3rem;
  }

  .sources {
    margin-top: 0.6rem;
    padding-top: 0.4rem;
    border-top: 1px solid #ccc;
    font-size: 0.8rem;

    .sources-title {
      font-weight: bold;
      margin: 0 0 0.2rem 0;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
  }

  @keyframes chat-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

function CitationList({ citations }: Readonly<{ citations: Citation[] }>) {
  return (
    <div className="sources">
      <p className="sources-title">Sources</p>
      <ul>
        {citations.map((c, i) => (
          <li key={`${c.location?.uri ?? c.title ?? 'source'}-${i}`}>
            {c.location?.uri ? (
              <a href={c.location.uri} target="_blank" rel="noopener noreferrer">
                {c.title || c.location.uri}
              </a>
            ) : (
              <span>{c.title || `Source ${i + 1}`}</span>
            )}
            {c.location?.pageNumber !== undefined && <span> (p.{c.location.pageNumber})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  message: ChatMessage;
}

// Memoized: while one answer streams, the other bubbles keep the same message object and skip re-parsing Markdown.
export const ChatMessageBubble = memo(function ChatMessageBubble({ message }: Readonly<Props>) {
  const isUser = message.role === 'user';

  return (
    <SRow $isUser={isUser} data-testid={`chat-message-${message.role}`}>
      <SBubble $isUser={isUser}>
        {isUser ? (
          <p className="user-text">{message.content}</p>
        ) : (
          // react-markdown doesn't render raw HTML, so model output can't inject markup.
          <div className="markdown">
            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.streaming ? stabilizeStreamingMarkdown(message.content) : message.content}
            </Markdown>
          </div>
        )}

        {message.streaming && !message.content && (
          <p className="progress" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            {PROGRESS_LABELS[message.status ?? 'thinking']}
          </p>
        )}

        {message.streaming && message.content && <span className="cursor" aria-hidden="true" />}

        {!message.streaming && message.groundingStatus === 'PARTIALLY_SUPPORTED' && (
          <p className="partial-note">The documentation covers only part of this question.</p>
        )}

        {!message.streaming && message.citations && message.citations.length > 0 && (
          <CitationList citations={message.citations} />
        )}
      </SBubble>
    </SRow>
  );
});

export default ChatMessageBubble;

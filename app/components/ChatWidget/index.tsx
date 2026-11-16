import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
} from 'react';
import styled from 'styled-components';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentDots,
  faDownLeftAndUpRightToCenter,
  faEllipsisVertical,
  faPenToSquare,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { PRIMARY_RED, SECONDARY_BLUE } from '@app/styles/theme';
import GenericModal, { ModalRef, emptyRef } from '@app/components/GenericModal';
import ChatMessageBubble from './ChatMessageBubble';
import ChatInput, { type ChatInputRef } from './ChatInput';
import { CHAT_STATUS_URL, useChat } from './useChat';

const HEADER_HEIGHT = '4rem';
const NOTICE_MS = 4000;
const DEFAULT_MAX_PROMPT_LENGTH = 500;
// The survey box collapses over 500ms (components/SurveyBox.tsx); wait for it so the two never overlap.
const SURVEY_TRANSITION_MS = 500;

const SLauncher = styled.button`
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 10;
  width: 3.5rem;
  height: 3.5rem;
  padding: 0;
  border-radius: 50%;
  background-color: ${SECONDARY_BLUE};
  color: #fff;
  font-size: 1.5rem;
  box-shadow: rgba(0, 0, 0, 0.25) 0 2px 6px;

  &:hover {
    background-color: #1e5189;
  }

  &:focus-visible {
    outline: 4px solid #3b99fc;
    outline-offset: 1px;
  }

  @media (max-width: 576px) {
    right: 1rem;
    bottom: 1rem;
  }
`;

// Same frame as the survey box (components/SurveyBox.tsx), so the two read as one family.
const SWindow = styled.section`
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 10;
  width: 400px;
  max-width: 100vw;
  height: 600px;
  max-height: calc(100vh - 1rem);
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 0.5rem 0.5rem 0 0;
  box-shadow: rgba(0, 0, 0, 0.15) -2px 2px 2.5px;
  overflow: hidden;

  .header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: ${HEADER_HEIGHT};
    padding: 1rem;
    background-color: ${SECONDARY_BLUE};
    color: white;

    h2 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: bold;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .icon-button {
      padding: 0.25rem 0.6rem;
      background: none;
      color: white;
      font-size: 1.2rem;
      line-height: 1;

      &:hover {
        background-color: rgba(255, 255, 255, 0.15);
      }

      &:focus-visible {
        outline: 4px solid #3b99fc;
        outline-offset: 1px;
      }
    }

    .dropdown-menu {
      min-width: 11rem;
      padding: 0.25rem 0;
      font-size: 0.95rem;
      box-shadow: rgba(0, 0, 0, 0.15) 0 2px 6px;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 1rem;
      border-radius: 0;
      font-weight: normal;
      text-align: left;
      color: #313132;

      &:hover,
      &:focus {
        background-color: #f2f2f2;
        text-decoration: underline;
      }

      &.delete {
        color: ${PRIMARY_RED};
      }

      // react-bootstrap marks a disabled item with aria-disabled and ignores clicks on it.
      &[aria-disabled='true'] {
        color: #9f9d9c;
        background: none;
        text-decoration: none;
        box-shadow: none !important;
      }
    }
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .empty-state {
    margin: auto 0;
    text-align: center;
    color: #313132;

    p {
      margin: 0 0 0.5rem 0;
    }

    .disclaimer {
      font-size: 0.8rem;
      color: #606060;
    }
  }

  .error-message {
    margin: 0;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    color: #a12622;
    background-color: #f2dede;
    border: 1px solid #d8292f;
    border-radius: 0.3rem;
  }

  .notice {
    margin: 0;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    color: #2d4821;
    background-color: #dff0d8;
    border: 1px solid #2e8540;
    border-radius: 0.3rem;
  }
`;

// The menu's trigger: an icon button, without the caret and button styling Bootstrap's toggle adds.
const MenuToggle = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'>>(function MenuToggle(
  { className: _className, children: _children, ...props },
  ref,
) {
  return (
    <button ref={ref} type="button" className="icon-button" aria-label="Chat options" title="Chat options" {...props}>
      <FontAwesomeIcon icon={faEllipsisVertical} />
    </button>
  );
});

interface ChatStatus {
  enabled: boolean;
  maxPromptLength?: number;
}

interface Props {
  /** The signed-in user; their conversation in this tab is restored after a page refresh. */
  userId: string;
  /** Hidden (but kept mounted, so a conversation survives) while the survey box is on screen. */
  hidden?: boolean;
}

function ChatWidget({ userId, hidden = false }: Readonly<Props>) {
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [concealed, setConcealed] = useState(hidden);
  const [menuOpen, setMenuOpen] = useState(false);
  const { messages, isStreaming, error, sendMessage, clearMessages, deleteHistory } = useChat(userId);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<ChatInputRef>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<ModalRef>(emptyRef);
  const wasOpen = useRef(false);
  const messageCount = messages.length;

  useEffect(() => {
    let cancelled = false;
    fetch(CHAT_STATUS_URL)
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data: ChatStatus) => !cancelled && setStatus(data))
      .catch(() => !cancelled && setStatus({ enabled: false }));
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide at once when the survey appears; reappear only once it has finished collapsing.
  useEffect(() => {
    if (hidden) {
      setConcealed(true);
      return;
    }
    const timer = setTimeout(() => setConcealed(false), SURVEY_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [hidden]);

  // Move focus into the window when it opens and back to the launcher when it closes.
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) launcherRef.current?.focus();
    if (!open) setMenuOpen(false);
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  // A new message scrolls into view.
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount, open]);

  // While an answer streams, follow it, unless the user has scrolled up to read.
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    // With the menu open, Escape closes just the menu (the Dropdown handles that).
    if (e.key === 'Escape' && !menuOpen) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const handleNewChat = async () => {
    await clearMessages();
    inputRef.current?.focus();
  };

  const openDeleteConfirm = () => {
    setDeleteError(null);
    deleteModalRef.current.open();
  };

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteHistory();
      setDeleteError(null);
      setNotice('Your chat history was deleted.');
      return true;
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Your chat history could not be deleted.');
      deleteModalRef.current.updateConfig({ confirmButtonText: 'Try again' });
      // Keeps the dialog open so the user can retry.
      return false;
    }
  }, [deleteHistory]);

  if (!status?.enabled) return null;

  const maxPromptLength = status.maxPromptLength ?? DEFAULT_MAX_PROMPT_LENGTH;

  return (
    <div
      style={concealed ? { display: 'none' } : undefined}
      aria-hidden={concealed || undefined}
      data-testid="chat-widget"
    >
      {open ? (
        <SWindow aria-label="CSS Assistant" onKeyDown={handleKeyDown} data-testid="chat-window">
          <div className="header">
            <h2>CSS Assistant</h2>
            <div className="header-actions">
              <Dropdown align="end" show={menuOpen} onToggle={(nextShow) => setMenuOpen(nextShow)}>
                <Dropdown.Toggle as={MenuToggle} id="css-assistant-menu" data-testid="chat-menu" />
                <Dropdown.Menu>
                  <Dropdown.Item
                    as="button"
                    type="button"
                    onClick={handleNewChat}
                    disabled={messages.length === 0 && !error}
                  >
                    <FontAwesomeIcon icon={faPenToSquare} fixedWidth />
                    New chat
                  </Dropdown.Item>
                  {/* Available when idle even with nothing on screen: other tabs may have stored history. Not while an
                      answer streams, since the RAG API saves the conversation when that turn ends, after the delete. */}
                  <Dropdown.Item
                    as="button"
                    type="button"
                    className="delete"
                    onClick={openDeleteConfirm}
                    disabled={isStreaming}
                    aria-haspopup="dialog"
                  >
                    <FontAwesomeIcon icon={faTrash} fixedWidth />
                    Delete history
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Minimize CSS Assistant"
                title="Minimize"
              >
                <FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} />
              </button>
            </div>
          </div>

          <div className="messages" ref={messagesRef} aria-label="Conversation">
            {messages.length === 0 && (
              <div className="empty-state">
                <p>
                  <strong>Hi! I&apos;m the CSS Assistant.</strong>
                </p>
                <p>Ask me about integrating with Common Hosted Single Sign-On, identity providers, roles and more.</p>
                <p className="disclaimer">
                  Answers are generated by AI from the CSS documentation and may not always be accurate. Please
                  don&apos;t share personal or sensitive information.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <div role="status" aria-live="polite">
              {notice && <p className="notice">{notice}</p>}
            </div>
          </div>

          <ChatInput ref={inputRef} onSend={sendMessage} disabled={isStreaming} maxLength={maxPromptLength} />
        </SWindow>
      ) : (
        <SLauncher
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the CSS Assistant chat"
          aria-expanded={false}
          title="Ask the CSS Assistant"
          data-testid="chat-launcher"
        >
          <FontAwesomeIcon icon={faCommentDots} />
        </SLauncher>
      )}

      <GenericModal
        ref={deleteModalRef}
        title="Delete chat history"
        confirmButtonText="Delete"
        confirmButtonVariant="danger"
        cancelButtonVariant="secondary"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteError(null)}
      >
        <div>
          <p>This permanently deletes your conversations with the CSS Assistant in every open tab of this browser.</p>
          {deleteError && (
            <p role="alert" style={{ color: '#a12622', marginBottom: 0 }}>
              {deleteError}
            </p>
          )}
        </div>
      </GenericModal>
    </div>
  );
}

export default ChatWidget;

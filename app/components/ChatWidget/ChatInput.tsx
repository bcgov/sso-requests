import { useRef, useState, forwardRef, useImperativeHandle, type KeyboardEvent, type FormEvent } from 'react';
import styled from 'styled-components';

const MAX_ROWS_HEIGHT = '8rem';

const SForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem 1rem 1rem;
  border-top: 1px solid #e0e0e0;

  textarea {
    width: 100%;
    resize: none;
    padding: 0.5em 0.6em;
    border: 2px solid #606060;
    border-radius: 0.25em;
    font-size: 0.95rem;
    max-height: ${MAX_ROWS_HEIGHT};
    overflow-y: auto;

    &:focus {
      outline: 4px solid #3b99fc;
      outline-offset: 1px;
    }
  }

  .input-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .char-count {
    font-size: 0.8rem;
    color: #606060;

    &.at-limit {
      color: #d8292f;
    }
  }
`;

export interface ChatInputRef {
  focus: () => void;
}

interface Props {
  onSend: (prompt: string) => void;
  disabled: boolean;
  maxLength: number;
}

export const ChatInput = forwardRef<ChatInputRef, Readonly<Props>>(function ChatInput(
  { onSend, disabled, maxLength },
  ref,
) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }));

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <SForm onSubmit={handleSubmit}>
      <label htmlFor="css-assistant-input" className="visually-hidden">
        Ask the CSS Assistant a question
      </label>
      <textarea
        id="css-assistant-input"
        ref={textareaRef}
        rows={2}
        value={value}
        maxLength={maxLength}
        onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
        onKeyDown={handleKeyDown}
        onInput={resize}
        placeholder="Ask a question about CSS…"
        aria-describedby="css-assistant-char-count"
        data-testid="chat-input"
      />
      <div className="input-footer">
        <span
          id="css-assistant-char-count"
          className={`char-count ${value.length >= maxLength ? 'at-limit' : ''}`}
          aria-live={value.length >= maxLength ? 'polite' : 'off'}
        >
          {value.length}/{maxLength}
        </span>
        <button type="submit" className="primary" disabled={disabled || !value.trim()} data-testid="chat-send">
          Send
        </button>
      </div>
    </SForm>
  );
});

export default ChatInput;

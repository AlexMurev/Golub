import React, { useEffect, useRef, useState } from 'react';
import SendIcon from '@renderer/assets/send.svg?react';
import './ChatInput.css';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  isConnected: boolean;
  hasReply: boolean;
}

const MAX_ROWS = 8;
const LINE_HEIGHT = 20;

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  sendMessage,
  isConnected,
  hasReply
}): React.JSX.Element => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Автовысота textarea в зависимости от содержимого
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 20; // + padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className={`chat-input-area ${isFocused ? 'chat-input-area--focused' : ''} ${!isConnected ? 'chat-input-area--disabled' : ''}`}
    >
      <textarea
        ref={textareaRef}
        className="chat-input-area__message"
        value={input}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={(): void => setIsFocused(true)}
        onBlur={(): void => setIsFocused(false)}
        placeholder={hasReply ? 'Введите ответ...' : 'Введите сообщение...'}
        disabled={!isConnected}
        rows={1}
      />
      <button
        className="chat-input-area__send-button"
        onClick={sendMessage}
        disabled={!isConnected || !input.trim()}
        title="Отправить"
      >
        <SendIcon height={30} width={30} />
      </button>
    </div>
  );
};

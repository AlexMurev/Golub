import React, { useState } from 'react';
import './ChatInput.css';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  isConnected: boolean;
  hasReply: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  sendMessage,
  isConnected,
  hasReply
}): React.JSX.Element => {
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className={`chat-input-area ${isFocused ? 'chat-input-area--focused' : ''} ${!isConnected ? 'chat-input-area--disabled' : ''}`}
    >
      <input
        className="chat-input-area__message"
        type="text"
        value={input}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={(): void => setIsFocused(true)}
        onBlur={(): void => setIsFocused(false)}
        placeholder={hasReply ? 'Введите ответ...' : 'Введите сообщение...'}
        disabled={!isConnected}
      />
      <button
        className="chat-input-area__button-send"
        onClick={sendMessage}
        disabled={!isConnected || !input.trim()}
        title="Ответить"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  );
};

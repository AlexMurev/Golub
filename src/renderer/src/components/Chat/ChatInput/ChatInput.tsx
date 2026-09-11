import React, { useState } from 'react';
import './ChatInput.css';
import SendIcon from '@renderer/assets/send.svg?react';

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
        className="chat-input-area__send-button"
        onClick={sendMessage}
        disabled={!isConnected || !input.trim()}
        title="Отправить"
      >
        <SendIcon />
      </button>
    </div>
  );
};

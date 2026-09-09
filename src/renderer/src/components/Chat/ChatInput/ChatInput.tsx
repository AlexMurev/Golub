import React from 'react';
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
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-input-area">
      <input
        className="chat-input-area__message"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={hasReply ? 'Введите ответ...' : 'Введите сообщение...'}
        disabled={!isConnected}
      />
      <button
        className="chat-input-area__button-send"
        onClick={sendMessage}
        disabled={!isConnected || !input.trim()}
      >
        Отправить
      </button>
    </div>
  );
};

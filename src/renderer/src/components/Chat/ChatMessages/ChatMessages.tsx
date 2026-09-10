import React, { useEffect, useRef } from 'react';
import type { Message } from '../Chat';
import './ChatMessages.css';

interface ChatMessagesProps {
  messages: Message[];
  myId: string;
  onReply: (message: Message) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  myId,
  onReply
}): React.JSX.Element => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-messages">
      {messages.map((msg) => {
        const isOwn = msg.senderId === myId;
        return (
          <div
            key={msg.id}
            className={`chat-messages__wrapper ${isOwn ? 'chat-messages__wrapper--own' : ''}`}
          >
            <div className={`chat-message ${isOwn ? 'chat-message--own' : ''}`}>
              <button
                className="chat-message__reply-btn"
                onClick={(): void => onReply(msg)}
                title="Ответить"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 17 4 12 9 7"></polyline>
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                </svg>
              </button>

              {msg.replyTo && (
                <div className="chat-message__reply">
                  <span className="chat-message__reply-sender">{msg.replyTo.senderNickname}</span>
                  <span className="chat-message__reply-text">{msg.replyTo.text}</span>
                </div>
              )}

              <div className="chat-message__content">
                <span className="chat-message__sender">{isOwn ? 'Вы' : msg.senderNickname}</span>
                <span className="chat-message__text">{msg.text}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

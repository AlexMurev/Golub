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
  onReply
}): React.JSX.Element => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatFullDate = (timestamp: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortTime = (timestamp: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-messages">
      {messages.map((msg, index) => {
        // Проверяем предыдущее сообщение для группировки
        const prevMsg = index > 0 ? messages[index - 1] : null;

        // Условия группировки: тот же автор, нет ответа, и прошло менее 5 минут (300000 мс)
        const isGrouped =
          prevMsg &&
          prevMsg.senderId === msg.senderId &&
          !msg.replyTo &&
          msg.createdAt - prevMsg.createdAt < 300000;

        return (
          <div
            key={msg.id}
            className={`chat-message-row ${isGrouped ? 'chat-message-row--grouped' : ''}`}
          >
            {/* Левая колонка: Аватарка или Короткое время ховера */}
            <div className="chat-message__left-column">
              {isGrouped ? (
                <span className="chat-message__hover-time">{formatShortTime(msg.createdAt)}</span>
              ) : msg.senderAvatar ? (
                <img
                  src={msg.senderAvatar}
                  alt={msg.senderNickname}
                  className="chat-message__avatar"
                />
              ) : (
                <div className="chat-message__avatar chat-message__avatar--placeholder">
                  {msg.senderNickname.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
            </div>

            <div className="chat-message">
              {/* Кнопка ответа */}
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

              {/* Блок цитирования (только для не сгруппированных по логике, либо если явно вызван ответ) */}
              {msg.replyTo && (
                <div className="chat-message__reply">
                  {msg.replyTo.senderAvatar ? (
                    <img
                      src={msg.replyTo.senderAvatar}
                      alt={msg.replyTo.senderNickname}
                      className="chat-message__reply-avatar"
                    />
                  ) : (
                    <div className="chat-message__reply-avatar chat-message__reply-avatar--placeholder">
                      {msg.replyTo.senderNickname.charAt(0).toUpperCase() || 'A'}
                    </div>
                  )}
                  <span className="chat-message__reply-sender">{msg.replyTo.senderNickname}</span>
                  <span className="chat-message__reply-text">{msg.replyTo.text}</span>
                </div>
              )}

              {/* Шапка метаданных рендерится только если сообщение НЕ сгруппировано */}
              {!isGrouped && (
                <div className="chat-message__meta">
                  <span className="chat-message__sender">{msg.senderNickname}</span>
                  <span className="chat-message__timestamp">{formatFullDate(msg.createdAt)}</span>
                </div>
              )}

              {/* Текст сообщения */}
              <div className="chat-message__text">{msg.text}</div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { ContextMenu, ContextMenuItem } from '@renderer/components/ContextMenu/ContextMenu';
import type { Message } from '../Chat';
import './ChatMessages.css';

interface ChatMessagesProps {
  messages: Message[];
  myId: string;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  message: Message;
}

const SCROLL_BOTTOM_THRESHOLD = 50;

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  myId,
  onReply,
  onDelete
}): React.JSX.Element => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef<boolean>(true);
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const el = e.currentTarget;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD;
  };

  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage.senderId === myId;

    if (isAtBottomRef.current || isOwnMessage) {
      scrollToBottom();
    }
  }, [messages, myId]);

  useEffect(() => {
    const closeMenu = (): void => setMenuState(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, msg: Message): void => {
    e.preventDefault();
    setMenuState({
      x: e.clientX,
      y: e.clientY,
      message: msg
    });
  };

  const handleCopyText = (text: string): void => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Ошибка копирования: ', err);
    });
  };

  const handleJumpToMessage = (targetId: string): void => {
    const targetElement = document.getElementById(`msg-${targetId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setHighlightedId(targetId);
      setTimeout(() => {
        setHighlightedId(null);
      }, 1000);
    }
  };

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

  const getMenuActions = (msg: Message): ContextMenuItem[] => {
    const actions: ContextMenuItem[] = [
      {
        label: 'Ответить',
        onClick: (): void => onReply(msg),
        icon: (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="9 17 4 12 9 7"></polyline>
            <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
          </svg>
        )
      },
      {
        label: 'Копировать текст',
        onClick: (): void => handleCopyText(msg.text),
        icon: (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        )
      }
    ];

    if (msg.senderId === myId) {
      actions.push({
        label: 'Удалить сообщение',
        onClick: (): void => onDelete(msg.id),
        isDanger: true,
        icon: (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        )
      });
    }

    return actions;
  };

  return (
    <div className="chat-messages" onScroll={handleScroll}>
      {messages.map((msg, index) => {
        const prevMsg = index > 0 ? messages[index - 1] : null;

        const isGrouped =
          prevMsg &&
          prevMsg.senderId === msg.senderId &&
          !msg.replyTo &&
          msg.createdAt - prevMsg.createdAt < 300000;

        return (
          <div
            id={`msg-${msg.id}`}
            key={msg.id}
            className={`chat-message-row ${isGrouped ? 'chat-message-row--grouped' : ''} ${highlightedId === msg.id ? 'chat-message-row--highlighted' : ''}`}
            onContextMenu={(e: React.MouseEvent): void => handleContextMenu(e, msg)}
          >
            <div className="chat-message-row__left-column">
              {isGrouped ? (
                <span className="chat-message-row__hover-time">
                  {formatShortTime(msg.createdAt)}
                </span>
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
                <div
                  className="chat-message__reply"
                  onClick={(): void => handleJumpToMessage(msg.replyTo!.id)}
                  title="Перейти к сообщению"
                >
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

              {!isGrouped && (
                <div className="chat-message__meta">
                  <span className="chat-message__sender">{msg.senderNickname}</span>
                  <span className="chat-message__timestamp">{formatFullDate(msg.createdAt)}</span>
                </div>
              )}

              <div className="chat-message__text">{msg.text}</div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={getMenuActions(menuState.message)}
          onClose={(): void => setMenuState(null)}
        />
      )}
    </div>
  );
};

import React from 'react';
import ReactPlayer from 'react-player';
import type { Message } from '@shared/types';
import { formatFullDate, formatShortTime } from '@renderer/utils/dateUtils';
import ReplyIcon from '@renderer/assets/reply.svg?react';
import { MessageText } from './MessageText';
import { LinkPreview } from './LinkPreview';
import './ChatMessageItem.css';

interface ChatMessageItemProps {
  msg: Message;
  isGrouped: boolean;
  isHighlighted: boolean;
  onContextMenu: (e: React.MouseEvent, msg: Message) => void;
  onReply: (msg: Message) => void;
  onJumpToMessage: (targetId: string) => void;
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

function isVideoUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be|vimeo\.com|twitch\.tv|dailymotion\.com)/i.test(url);
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(
  ({
    msg,
    isGrouped,
    isHighlighted,
    onContextMenu,
    onReply,
    onJumpToMessage
  }): React.JSX.Element | null => {
    if (msg.deletedAt) return null;

    const avatarPlaceholder: string = msg.senderNickname.charAt(0).toUpperCase() || 'A';
    const replyPlaceholder: string = msg.replyTo?.senderNickname.charAt(0).toUpperCase() || 'A';

    const firstUrl: string | null = extractFirstUrl(msg.text);
    const isVideo: boolean = firstUrl !== null && isVideoUrl(firstUrl);

    return (
      <div
        id={`msg-${msg.id}`}
        className={`message-row ${isGrouped ? 'message-row--grouped' : ''} ${isHighlighted ? 'message-row--highlighted' : ''}`}
        onContextMenu={(e: React.MouseEvent): void => onContextMenu(e, msg)}
      >
        <div className="message-row__left-column">
          {isGrouped ? (
            <span className="message-row__hover-time">{formatShortTime(msg.createdAt)}</span>
          ) : msg.senderAvatar ? (
            <img src={msg.senderAvatar} alt={msg.senderNickname} className="message__avatar" />
          ) : (
            <div className="message__avatar message__avatar--placeholder">{avatarPlaceholder}</div>
          )}
        </div>

        <div className="message">
          <button
            className="message__reply-btn"
            onClick={(): void => onReply(msg)}
            title="Ответить"
          >
            <ReplyIcon />
          </button>

          {msg.replyTo && (
            <div
              className="message__reply"
              onClick={(): void => onJumpToMessage(msg.replyTo!.id)}
              title="Перейти к сообщению"
            >
              {msg.replyTo.senderAvatar ? (
                <img
                  src={msg.replyTo.senderAvatar}
                  alt={msg.replyTo.senderNickname}
                  className="message__reply-avatar"
                />
              ) : (
                <div className="message__reply-avatar message__reply-avatar--placeholder">
                  {replyPlaceholder}
                </div>
              )}
              <span className="message__reply-sender">{msg.replyTo.senderNickname}</span>
              <span className="message__reply-text">
                {msg.replyTo.replyDeleted ? 'сообщение удалено' : msg.replyTo.text}
              </span>
            </div>
          )}

          {!isGrouped && (
            <div className="message__meta">
              <span className="message__sender">{msg.senderNickname}</span>
              <span className="message__timestamp">{formatFullDate(msg.createdAt)}</span>
              {msg.editedAt && <span className="message__edited">(изменено)</span>}
            </div>
          )}

          <MessageText text={msg.text} />

          {isVideo && firstUrl && (
            <div className="message__video">
              <ReactPlayer src={firstUrl} width="100%" height="240px" controls />
            </div>
          )}

          {!isVideo && firstUrl && <LinkPreview url={firstUrl} />}
        </div>
      </div>
    );
  }
);

ChatMessageItem.displayName = 'ChatMessageItem';

import React, { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import type { Message } from '@shared/types';
import { formatFullDate, formatShortTime } from '@renderer/utils/dateUtils';
import { openImage } from '@renderer/utils/imageViewer';
import ReplyIcon from '@renderer/assets/reply.svg?react';
import { MarkDownText } from '../../../MarkDownText/MarkDownText';
import { LinkPreview } from './LinkPreview/LinkPreview';
import { AttachmentCard } from './AttachmentCard/AttachmentCard';
import { MessageStatus } from './MessageStatus/MessageStatus';
import './ChatMessageItem.css';

interface ChatMessageItemProps {
  msg: Message;
  myId: string;
  isGrouped: boolean;
  isHighlighted: boolean;
  isEditing: boolean;
  onContextMenu: (e: React.MouseEvent, msg: Message) => void;
  onReply: (msg: Message) => void;
  onJumpToMessage: (targetId: string) => void;
  onSubmitEdit: (id: string, text: string) => void;
  onCancelEdit: () => void;
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
    myId,
    isGrouped,
    isHighlighted,
    isEditing,
    onContextMenu,
    onReply,
    onJumpToMessage,
    onSubmitEdit,
    onCancelEdit
  }): React.JSX.Element | null => {
    const [editText, setEditText] = useState<string>(msg.text);
    const [prevIsEditing, setPrevIsEditing] = useState<boolean>(isEditing);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    if (isEditing !== prevIsEditing) {
      setPrevIsEditing(isEditing);
      if (isEditing) setEditText(msg.text);
    }

    useEffect(() => {
      if (!isEditing) return;
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [isEditing]);

    if (msg.deletedAt) return null;

    const isOwn = msg.senderId === myId;
    const avatarPlaceholder: string = msg.senderNickname.charAt(0).toUpperCase() || 'A';
    const replyPlaceholder: string = msg.replyTo?.senderNickname.charAt(0).toUpperCase() || 'A';

    const firstUrl: string | null = extractFirstUrl(msg.text);
    const isVideo: boolean = firstUrl !== null && isVideoUrl(firstUrl);
    const isUrlOnly: boolean = firstUrl !== null && msg.text.trim() === firstUrl;

    const imageAttachments = msg.attachments.filter((att) => att.mimeType?.startsWith('image/'));

    const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setEditText(e.target.value);
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const trimmed: string = editText.trim();
        if (trimmed !== msg.text) {
          onSubmitEdit(msg.id, trimmed);
        } else {
          onCancelEdit();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancelEdit();
      }
    };

    return (
      <div
        id={`msg-${msg.id}`}
        className={`message-row ${isGrouped ? 'message-row--grouped' : ''} ${isHighlighted ? 'message-row--highlighted' : ''} ${isEditing ? 'message-row--editing' : ''}`}
        onContextMenu={(e: React.MouseEvent): void => onContextMenu(e, msg)}
      >
        <div className="message-row__left-column">
          {isGrouped ? (
            <span className="message-row__hover-time">
              {formatShortTime(msg.createdAt)}
              {isOwn && !isEditing && <MessageStatus status={msg.status} />}
            </span>
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
              {isOwn && !isEditing && <MessageStatus status={msg.status} />}
            </div>
          )}

          {isEditing ? (
            <div className="message__edit">
              <textarea
                ref={textareaRef}
                className="message__edit-input"
                value={editText}
                onChange={handleEditChange}
                onKeyDown={handleEditKeyDown}
                rows={1}
              />
              <span className="message__edit-hint">escape — отмена • enter — сохранить</span>
            </div>
          ) : (
            msg.text && <MarkDownText text={msg.text} />
          )}

          {msg.attachments.length > 0 && (
            <div className="message__attachments">
              {msg.attachments.map((att) => {
                const imageIndex = imageAttachments.indexOf(att);
                return (
                  <AttachmentCard
                    key={att.id}
                    attachment={att}
                    onImageOpen={
                      imageIndex !== -1
                        ? (): void => openImage(imageAttachments, imageIndex)
                        : undefined
                    }
                  />
                );
              })}
            </div>
          )}

          {!isEditing && isVideo && firstUrl && (
            <div className="message__video">
              <ReactPlayer src={firstUrl} width="100%" height="100%" controls />
            </div>
          )}

          {!isEditing && !isVideo && firstUrl && isUrlOnly && <LinkPreview url={firstUrl} />}
        </div>
      </div>
    );
  }
);

ChatMessageItem.displayName = 'ChatMessageItem';

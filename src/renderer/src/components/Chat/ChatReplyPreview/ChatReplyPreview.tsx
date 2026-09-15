import React from 'react';
import type { ReplyPreview } from '@shared/types';
import './ChatReplyPreview.css';

interface ChatReplyPreviewProps {
  replyTo: ReplyPreview;
  onCancel: () => void;
}

export const ChatReplyPreview: React.FC<ChatReplyPreviewProps> = ({ replyTo, onCancel }) => {
  return (
    <div className="chat-reply-preview">
      <div className="chat-reply-preview__content">
        <span className="chat-reply-preview__sender">{replyTo.senderNickname}</span>
        <span className="chat-reply-preview__text">
          {replyTo.replyDeleted ? 'сообщение удалено' : replyTo.text}
        </span>
      </div>
      <button className="chat-reply-preview__cancel" onClick={onCancel} title="Отменить ответ">
        ✕
      </button>
    </div>
  );
};

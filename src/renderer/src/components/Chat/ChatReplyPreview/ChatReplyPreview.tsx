import React from 'react';
import './ChatReplyPreview.css';

interface ChatReplyPreviewProps {
  replyTo: { sender: string; text: string };
  onCancel: () => void;
}

export const ChatReplyPreview: React.FC<ChatReplyPreviewProps> = ({ replyTo, onCancel }) => {
  return (
    <div className="chat-reply-preview">
      <div className="chat-reply-preview__content">
        <span className="chat-reply-preview__sender">{replyTo.sender}</span>
        <span className="chat-reply-preview__text">{replyTo.text}</span>
      </div>
      <button className="chat-reply-preview__cancel" onClick={onCancel}>
        ✕
      </button>
    </div>
  );
};

import React from 'react';
import './ChatEditPreview.css';

interface ChatEditPreviewProps {
  onCancel: () => void;
}

export const ChatEditPreview: React.FC<ChatEditPreviewProps> = ({ onCancel }) => {
  return (
    <div className="chat-edit-preview">
      <div className="chat-edit-preview__content">
        <span className="chat-edit-preview__label">Редактирование сообщения</span>
      </div>
      <button className="chat-edit-preview__cancel" onClick={onCancel} title="Отменить">
        ✕
      </button>
    </div>
  );
};

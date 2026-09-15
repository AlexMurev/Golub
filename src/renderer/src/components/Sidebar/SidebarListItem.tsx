import React from 'react';
import type { ChatListItem } from '@shared/types';
import { formatShortTime } from '../../utils/dateUtils';
import './SidebarListItem.css';

interface SidebarListItemProps {
  chat: ChatListItem;
  isActive: boolean;
  onClick: () => void;
}

export const SidebarListItem: React.FC<SidebarListItemProps> = ({
  chat,
  isActive,
  onClick
}): React.JSX.Element => {
  const avatarPlaceholder: string = chat.title.charAt(0).toUpperCase() || '?';

  const previewText: string = ((): string => {
    if (!chat.lastMessage) return 'Нет сообщений';
    const prefix: string = chat.type === 'group' ? `${chat.lastMessage.senderNickname}: ` : '';
    const text: string = chat.lastMessage.text || '[вложение]';
    return `${prefix}${text}`;
  })();

  const timeText: string = chat.lastMessage ? formatShortTime(chat.lastMessage.createdAt) : '';

  return (
    <button
      type="button"
      className={`sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
      onClick={onClick}
    >
      <div className="sidebar-item__avatar-wrapper">
        {chat.avatar ? (
          <img src={chat.avatar} alt={chat.title} className="sidebar-item__avatar" />
        ) : (
          <div className="sidebar-item__avatar sidebar-item__avatar--placeholder">
            {avatarPlaceholder}
          </div>
        )}
      </div>

      <div className="sidebar-item__content">
        <div className="sidebar-item__top">
          <span className="sidebar-item__title">{chat.title}</span>
          {timeText && <span className="sidebar-item__time">{timeText}</span>}
        </div>
        <div className="sidebar-item__preview">{previewText}</div>
      </div>
    </button>
  );
};

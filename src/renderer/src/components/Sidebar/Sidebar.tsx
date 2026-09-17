import React from 'react';
import { useChats } from '@renderer/hooks/useChats';
import { useContacts } from '@renderer/hooks/useContacts';
import { formatShortTime } from '@renderer/utils/dateUtils';
import { UserBar } from '../UserBar/UserBar';
import RequestsIcon from '@renderer/assets/requests.svg?react';
import AddContactIcon from '@renderer/assets/add-contact.svg?react';
import './Sidebar.css';

interface SidebarProps {
  onAddContact: () => void;
  onOpenRequests: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onAddContact,
  onOpenRequests,
  onOpenSettings
}): React.JSX.Element => {
  const { chats, currentChatId, selectChat } = useChats();
  const { incomingCount } = useContacts();

  const isEmpty: boolean = chats.length === 0;

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__title">Чаты</span>
        <div className="sidebar__actions">
          <button className="sidebar__icon-btn" onClick={onOpenRequests} title="Заявки в друзья">
            <RequestsIcon height={20} width={20} />
            {incomingCount > 0 && <span className="sidebar__badge">{incomingCount}</span>}
          </button>
          <button className="sidebar__icon-btn" onClick={onAddContact} title="Добавить контакт">
            <AddContactIcon height={20} width={20} />
          </button>
        </div>
      </div>

      <div className={`sidebar__list ${isEmpty ? 'sidebar__list--empty' : ''}`}>
        {isEmpty ? (
          <p className="sidebar__empty-text">
            Пока нет чатов.
            <br />
            Добавьте контакт, чтобы начать переписку.
          </p>
        ) : (
          chats.map((chat) => {
            const avatarPlaceholder: string = chat.title.charAt(0).toUpperCase() || '?';
            const isActive: boolean = chat.id === currentChatId;
            const isDirect: boolean = chat.type === 'direct';
            const isOnline: boolean | undefined = isDirect ? chat.isOnline : undefined;

            const lastMessage = chat.lastMessage;
            const previewText: string = lastMessage
              ? `${chat.type === 'group' ? `${lastMessage.senderNickname}: ` : ''}${lastMessage.text || '[вложение]'}`
              : 'Нет сообщений';

            const timeText: string = lastMessage ? formatShortTime(lastMessage.createdAt) : '';

            return (
              <button
                key={chat.id}
                type="button"
                className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                onClick={(): void => selectChat(chat.id)}
              >
                <div className="sidebar__item-avatar-wrapper">
                  {chat.avatar ? (
                    <img src={chat.avatar} alt={chat.title} className="sidebar__item-avatar" />
                  ) : (
                    <div className="sidebar__item-avatar sidebar__item-avatar--placeholder">
                      {avatarPlaceholder}
                    </div>
                  )}
                  {isOnline !== undefined && (
                    <span
                      className={`sidebar__item-status-dot ${isOnline ? 'sidebar__item-status-dot--online' : ''}`}
                    />
                  )}
                </div>

                <div className="sidebar__item-content">
                  <div className="sidebar__item-top">
                    <span className="sidebar__item-title">{chat.title}</span>
                    {timeText && <span className="sidebar__item-time">{timeText}</span>}
                  </div>
                  <div className="sidebar__item-bottom">
                    <span className="sidebar__item-preview">{previewText}</span>
                    {chat.unreadCount > 0 && (
                      <span className="sidebar__item-unread">{chat.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <UserBar onOpenSettings={onOpenSettings} />
    </div>
  );
};

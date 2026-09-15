import React from 'react';
import type { ChatListItem } from '@shared/types';
import { UserBar } from '../UserBar/UserBar';
import { SidebarListItem } from './SidebarListItem';
import RequestsIcon from '@renderer/assets/requests.svg?react';
import AddContactIcon from '@renderer/assets/add-contact.svg?react';
import './Sidebar.css';

interface SidebarProps {
  chats: ChatListItem[];
  currentChatId: string | null;
  nickname: string;
  avatar: string | undefined;
  isServerRunning: boolean;
  isConnected: boolean;
  incomingCount: number;
  onSelectChat: (chatId: string) => void;
  onAddContact: () => void;
  onOpenRequests: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  currentChatId,
  nickname,
  avatar,
  isServerRunning,
  isConnected,
  incomingCount,
  onSelectChat,
  onAddContact,
  onOpenRequests,
  onOpenSettings
}): React.JSX.Element => {
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
          chats.map((chat) => (
            <SidebarListItem
              key={chat.id}
              chat={chat}
              isActive={chat.id === currentChatId}
              onClick={(): void => onSelectChat(chat.id)}
            />
          ))
        )}
      </div>

      <UserBar
        nickname={nickname}
        avatar={avatar}
        isServerRunning={isServerRunning}
        isConnected={isConnected}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
};

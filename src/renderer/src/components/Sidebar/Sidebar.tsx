import React from 'react';
import type { ChatListItem } from '@shared/types';
import { SidebarList } from './SidebarList';
import { UserBar } from '../UserBar/UserBar';
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
  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__title">Чаты</span>
        <div className="sidebar__actions">
          <button className="sidebar__icon-btn" onClick={onOpenRequests} title="Заявки в друзья">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            {incomingCount > 0 && <span className="sidebar__badge">{incomingCount}</span>}
          </button>
          <button className="sidebar__icon-btn" onClick={onAddContact} title="Добавить контакт">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      <SidebarList chats={chats} currentChatId={currentChatId} onSelectChat={onSelectChat} />

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

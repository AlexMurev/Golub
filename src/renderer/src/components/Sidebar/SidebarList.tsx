import React from 'react';
import type { ChatListItem } from '@shared/types';
import { SidebarListItem } from './SidebarListItem';
import './SidebarList.css';

interface SidebarListProps {
  chats: ChatListItem[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

export const SidebarList: React.FC<SidebarListProps> = ({
  chats,
  currentChatId,
  onSelectChat
}): React.JSX.Element => {
  if (chats.length === 0) {
    return (
      <div className="sidebar-list sidebar-list--empty">
        <p className="sidebar-list__empty-text">
          Пока нет чатов.
          <br />
          Добавьте контакт, чтобы начать переписку.
        </p>
      </div>
    );
  }

  return (
    <div className="sidebar-list">
      {chats.map((chat) => (
        <SidebarListItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === currentChatId}
          onClick={(): void => onSelectChat(chat.id)}
        />
      ))}
    </div>
  );
};

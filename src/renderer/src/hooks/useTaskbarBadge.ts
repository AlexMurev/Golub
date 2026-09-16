import { useEffect } from 'react';
import { useChats } from './useChats';

export function useTaskbarBadge(): void {
  const { chats } = useChats();

  useEffect(() => {
    const total = chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
    void window.api.app.setBadge(total > 0);
  }, [chats]);
}

import { useCallback, useEffect, useState } from 'react';
import type { ChatListItem } from '@shared/types';

export interface UseChatsResult {
  chats: ChatListItem[];
  currentChatId: string | null;
  selectChat: (chatId: string | null) => void;
  openDirectChat: (peerId: string) => Promise<string | null>;
  reload: () => Promise<void>;
}

export function useChats(): UseChatsResult {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.db.chats.list();
      setChats(data);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async (): Promise<void> => {
      try {
        const data = await window.api.db.chats.list();
        if (!cancelled) setChats(data);
      } catch (err) {
        console.error('Failed to load chats:', err);
      }
    })();

    const unsubMessage = window.api.transport.onMessage((): void => {
      void reload();
    });
    const unsubOnline = window.api.transport.onPeerOnline((): void => {
      void reload();
    });
    const unsubOffline = window.api.transport.onPeerOffline((): void => {
      void reload();
    });
    const unsubNewPeer = window.api.transport.onNewPeer((): void => {
      void reload();
    });
    const unsubUpdated = window.api.transport.onPeerUpdated((): void => {
      void reload();
    });
    const unsubDataChanged = window.api.transport.onDataChanged((): void => {
      void reload();
    });
    return (): void => {
      cancelled = true;
      unsubMessage();
      unsubOnline();
      unsubOffline();
      unsubNewPeer();
      unsubUpdated();
      unsubDataChanged();
    };
  }, [reload]);

  const selectChat = useCallback((chatId: string | null): void => {
    setCurrentChatId(chatId);
  }, []);

  const openDirectChat = useCallback(
    async (peerId: string): Promise<string | null> => {
      try {
        const result = await window.api.db.chats.ensureDirect(peerId);
        if (!result.success || !result.chatId) {
          console.error('Failed to ensure direct chat:', result.error);
          return null;
        }
        await reload();
        setCurrentChatId(result.chatId);
        return result.chatId;
      } catch (err) {
        console.error('openDirectChat error:', err);
        return null;
      }
    },
    [reload]
  );

  return { chats, currentChatId, selectChat, openDirectChat, reload };
}

import { useCallback, useSyncExternalStore } from 'react';
import type { ChatListItem } from '@shared/types';

export interface UseChatsResult {
  chats: ChatListItem[];
  currentChatId: string | null;
  selectChat: (chatId: string | null) => void;
  openDirectChat: (peerId: string) => Promise<string | null>;
  reload: () => Promise<void>;
}

interface ChatsSnapshot {
  chats: ChatListItem[];
  currentChatId: string | null;
}

let snapshot: ChatsSnapshot = { chats: [], currentChatId: null };
const listeners = new Set<() => void>();
let started = false;

function emit(): void {
  listeners.forEach((listener): void => listener());
}

function setSnapshot(next: ChatsSnapshot): void {
  snapshot = next;
  emit();
}

async function loadChats(): Promise<void> {
  try {
    const data = await window.api.db.chats.list();
    setSnapshot({ ...snapshot, chats: data });
  } catch (err) {
    console.error('Failed to load chats:', err);
  }
}

function subscribe(listener: () => void): () => void {
  if (!started) {
    started = true;
    void loadChats();

    window.api.transport.onMessage((): void => {
      void loadChats();
    });
    window.api.transport.onPeerOnline((): void => {
      void loadChats();
    });
    window.api.transport.onPeerOffline((): void => {
      void loadChats();
    });
    window.api.transport.onNewPeer((): void => {
      void loadChats();
    });
    window.api.transport.onPeerUpdated((): void => {
      void loadChats();
    });
    window.api.transport.onDataChanged((): void => {
      void loadChats();
    });
  }
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ChatsSnapshot {
  return snapshot;
}

export function useChats(): UseChatsResult {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  const reload = useCallback(async (): Promise<void> => {
    await loadChats();
  }, []);

  const selectChat = useCallback((chatId: string | null): void => {
    setSnapshot({ ...snapshot, currentChatId: chatId });
  }, []);

  const openDirectChat = useCallback(async (peerId: string): Promise<string | null> => {
    try {
      const result = await window.api.db.chats.ensureDirect(peerId);
      if (!result.success || !result.chatId) {
        console.error('Failed to ensure direct chat:', result.error);
        return null;
      }
      await loadChats();
      setSnapshot({ ...snapshot, currentChatId: result.chatId });
      return result.chatId;
    } catch (err) {
      console.error('openDirectChat error:', err);
      return null;
    }
  }, []);

  return {
    chats: snap.chats,
    currentChatId: snap.currentChatId,
    selectChat,
    openDirectChat,
    reload
  };
}

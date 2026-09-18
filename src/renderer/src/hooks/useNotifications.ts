import { useEffect } from 'react';
import { useChats } from './useChats';
import { useSelf } from './useSelf';
import { playForPeer } from '@renderer/utils/sounds';
import * as sounds from '@renderer/utils/sounds';
import type { Message } from '@shared/types';

export function useNotifications(): void {
  const { currentChatId } = useChats();
  const { self } = useSelf();

  // Входящие: звук или пометка прочитанным
  useEffect(() => {
    if (!self) return;

    const unsub = window.api.transport.onMessage((_from, payload): void => {
      const p = payload as { type?: string; payload?: Message };
      if (p.type !== 'message' || !p.payload) return;

      const msg = p.payload;
      const isCurrent = msg.chatId === currentChatId;

      if (isCurrent && document.hasFocus()) {
        void window.api.db.chats.markRead(msg.chatId);
      } else {
        void playForPeer(msg.senderId);
      }
    });

    return (): void => {
      unsub();
    };
  }, [currentChatId, self]);

  // Входящая заявка в друзья → играем глобальный звук уведомлений
  useEffect(() => {
    const unsub = window.api.transport.onFriendRequest((): void => {
      void sounds.previewGlobal();
    });

    return (): void => {
      unsub();
    };
  }, []);

  // Смена чата → mark read
  useEffect(() => {
    if (!currentChatId) return;
    void window.api.db.chats.markRead(currentChatId);
  }, [currentChatId]);

  // Возврат фокуса окна → если чат открыт, помечаем прочитанным
  useEffect(() => {
    const handleFocus = (): void => {
      if (currentChatId) {
        void window.api.db.chats.markRead(currentChatId);
      }
    };
    window.addEventListener('focus', handleFocus);
    return (): void => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentChatId]);
}

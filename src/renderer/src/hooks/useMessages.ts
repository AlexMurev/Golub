import { useCallback, useEffect, useState } from 'react';
import type { Attachment, Message } from '@shared/types';

const PAGE_SIZE = 50;

export interface UseMessagesResult {
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingOlder: boolean;
  firstItemIndex: number;
  sendMessage: (text: string, replyToId: string | null, attachments: Attachment[]) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  loadOlder: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useMessages(chatId: string | null, selfPeerId: string | null): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesChatId, setMessagesChatId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [firstItemIndex, setFirstItemIndex] = useState<number>(0);

  // Обновление последних сообщений (после отправки/правки/удаления/входящих)
  const reload = useCallback(async (): Promise<void> => {
    if (!chatId) return;
    try {
      const data = await window.api.db.messages.list(chatId, PAGE_SIZE);
      setMessages((prev) => {
        if (data.length === 0) return prev;
        const newestCreatedAt = data[0].createdAt;
        // Оставляем всё, что старше свежей страницы, и пришиваем свежую страницу
        const older = prev.filter((m) => m.createdAt < newestCreatedAt);
        return [...older, ...data];
      });
      setMessagesChatId(chatId);
    } catch (err) {
      console.error('reload error:', err);
    }
  }, [chatId]);

  // Загрузка при смене чата
  useEffect(() => {
    if (!chatId) return;

    let cancelled = false;

    (async (): Promise<void> => {
      try {
        const data = await window.api.db.messages.list(chatId, PAGE_SIZE);
        if (!cancelled) {
          setMessages(data);
          setMessagesChatId(chatId);
          setHasMore(data.length === PAGE_SIZE);
          setFirstItemIndex(0);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    })();

    const unsubMessage = window.api.transport.onMessage((): void => {
      if (chatId) void reload();
    });
    const unsubData = window.api.transport.onDataChanged((): void => {
      if (chatId) void reload();
    });

    return (): void => {
      cancelled = true;
      unsubMessage();
      unsubData();
    };
  }, [chatId, reload]);

  // Подгрузка старых (скролл вверх)
  const loadOlder = useCallback(async (): Promise<void> => {
    if (!chatId || isLoadingOlder || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;

    setIsLoadingOlder(true);
    try {
      const older = await window.api.db.messages.list(chatId, PAGE_SIZE, oldest.createdAt);
      if (older.length === 0) {
        setHasMore(false);
        return;
      }
      setHasMore(older.length === PAGE_SIZE);
      setFirstItemIndex((prev) => prev - older.length);
      setMessages((prev) => [...older, ...prev]);
    } catch (err) {
      console.error('loadOlder error:', err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [chatId, messages, isLoadingOlder, hasMore]);

  const isLoading = chatId !== null && messagesChatId !== chatId;
  const displayMessages = messagesChatId === chatId ? messages : [];

  const sendMessage = useCallback(
    async (text: string, replyToId: string | null, attachments: Attachment[]): Promise<void> => {
      if (!chatId || !selfPeerId) return;
      if (!text.trim() && attachments.length === 0) return;

      const parts = chatId.split(':');
      if (parts.length !== 3 || parts[0] !== 'direct') {
        console.warn('sendMessage поддерживает только direct-чаты');
        return;
      }
      const [, idA, idB] = parts;
      const peerId = idA === selfPeerId ? idB : idA;

      try {
        const result = await window.api.db.messages.send(peerId, text, replyToId, attachments);
        if (!result.success) {
          console.error('Send failed:', result.error);
          return;
        }
        await reload();
      } catch (err) {
        console.error('sendMessage error:', err);
      }
    },
    [chatId, selfPeerId, reload]
  );

  const editMessage = useCallback(
    async (messageId: string, newText: string): Promise<void> => {
      try {
        await window.api.db.messages.edit(messageId, newText);
        await reload();
      } catch (err) {
        console.error('editMessage error:', err);
      }
    },
    [reload]
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      try {
        await window.api.db.messages.delete(messageId);
        await reload();
      } catch (err) {
        console.error('deleteMessage error:', err);
      }
    },
    [reload]
  );

  return {
    messages: displayMessages,
    isLoading,
    hasMore,
    isLoadingOlder,
    firstItemIndex,
    sendMessage,
    editMessage,
    deleteMessage,
    loadOlder,
    reload
  };
}

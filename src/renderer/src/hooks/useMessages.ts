import { useCallback, useEffect, useState } from 'react';
import type { Message } from '@shared/types';

export interface UseMessagesResult {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (text: string, replyToId: string | null) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useMessages(chatId: string | null, selfPeerId: string | null): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesChatId, setMessagesChatId] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    if (!chatId) return;
    try {
      const data = await window.api.db.messages.list(chatId, 500);
      setMessages(data);
      setMessagesChatId(chatId);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    let cancelled = false;

    (async (): Promise<void> => {
      try {
        const data = await window.api.db.messages.list(chatId, 500);
        if (!cancelled) {
          setMessages(data);
          setMessagesChatId(chatId);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    })();

    const unsubMessage = window.api.transport.onMessage((): void => {
      if (chatId) void reload();
    });

    const unsubDataChanged = window.api.transport.onDataChanged((): void => {
      if (chatId) void reload();
    });

    return (): void => {
      cancelled = true;
      unsubMessage();
      unsubDataChanged();
    };
  }, [chatId, reload]);

  const isLoading = chatId !== null && messagesChatId !== chatId;
  const displayMessages = messagesChatId === chatId ? messages : [];

  const sendMessage = useCallback(
    async (text: string, replyToId: string | null): Promise<void> => {
      if (!chatId || !selfPeerId || !text.trim()) return;

      const parts = chatId.split(':');
      if (parts.length !== 3 || parts[0] !== 'direct') {
        console.warn('sendMessage поддерживает только direct-чаты');
        return;
      }
      const [, idA, idB] = parts;
      const peerId = idA === selfPeerId ? idB : idA;

      try {
        const result = await window.api.db.messages.send(peerId, text, replyToId);
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

  return { messages: displayMessages, isLoading, sendMessage, editMessage, deleteMessage, reload };
}

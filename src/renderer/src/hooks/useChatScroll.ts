import { useLayoutEffect, useRef } from 'react';
import type { Message } from '@shared/types';

const SCROLL_BOTTOM_THRESHOLD = 50;
const LOAD_OLDER_THRESHOLD = 100;

interface UseChatScrollParams {
  chatId: string | null;
  messages: Message[];
  hasMore: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
}

interface UseChatScrollResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const useChatScroll = ({
  chatId,
  messages,
  hasMore,
  isLoadingOlder,
  onLoadOlder
}: UseChatScrollParams): UseChatScrollResult => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef<boolean>(true);

  const prevChatIdRef = useRef<string | null>(null);
  const prevFirstIdRef = useRef<string | null>(null);
  const prevLastIdRef = useRef<string | null>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const el = e.currentTarget;

    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD;
    lastScrollTopRef.current = el.scrollTop;
    lastScrollHeightRef.current = el.scrollHeight;

    if (el.scrollTop < LOAD_OLDER_THRESHOLD && hasMore && !isLoadingOlder) {
      onLoadOlder();
    }
  };

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const newFirstId = messages[0]?.id ?? null;
    const newLastId = messages[messages.length - 1]?.id ?? null;

    const isChatChange = prevChatIdRef.current !== chatId;
    const isPrepend =
      !isChatChange &&
      prevFirstIdRef.current !== null &&
      newFirstId !== prevFirstIdRef.current &&
      newLastId === prevLastIdRef.current;
    const isAppend = !isChatChange && newLastId !== prevLastIdRef.current && newLastId !== null;

    if (isChatChange) {
      // Смена чата — мгновенно вниз
      el.scrollTop = el.scrollHeight;
      isAtBottomRef.current = true;
    } else if (isPrepend) {
      // Подгрузили старые — сохраняем позицию
      const delta = el.scrollHeight - lastScrollHeightRef.current;
      el.scrollTop = lastScrollTopRef.current + delta;
    } else if (isAppend && isAtBottomRef.current) {
      // Новое сообщение — если были внизу, плавно едем вниз
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }

    prevChatIdRef.current = chatId;
    prevFirstIdRef.current = newFirstId;
    prevLastIdRef.current = newLastId;
    lastScrollHeightRef.current = el.scrollHeight;
    lastScrollTopRef.current = el.scrollTop;
  }, [messages, chatId]);

  return { containerRef, handleScroll };
};

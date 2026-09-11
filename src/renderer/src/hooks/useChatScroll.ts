import { useEffect, useRef } from 'react';
import type { Message } from '@renderer/types/chat';

const SCROLL_BOTTOM_THRESHOLD = 50;

interface UseChatScrollResult {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const useChatScroll = (messages: Message[], myId: string): UseChatScrollResult => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef<boolean>(true);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const el = e.currentTarget;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD;
  };

  useEffect((): void => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage.senderId === myId;

    if (isAtBottomRef.current || isOwnMessage) {
      scrollToBottom();
    }
  }, [messages, myId]);

  return { messagesEndRef, handleScroll };
};

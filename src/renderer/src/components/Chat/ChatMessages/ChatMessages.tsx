import React, { useState } from 'react';
import { ContextMenu, ContextMenuItem } from '@renderer/components/ContextMenu/ContextMenu';
import type { Message } from '@shared/types';
import { useChatScroll } from '@renderer/hooks/useChatScroll';
import { useMessageContextMenu } from '@renderer/hooks/useMessageContextMenu';
import { ChatMessageItem } from './ChatMessageItem/ChatMessageItem';
import './ChatMessages.css';

import ReplyIcon from '@renderer/assets/reply.svg?react';
import CopyIcon from '@renderer/assets/copy.svg?react';
import EditIcon from '@renderer/assets/edit.svg?react';
import DeleteIcon from '@renderer/assets/delete.svg?react';

interface ChatMessagesProps {
  messages: Message[];
  myId: string;
  onReply: (message: Message) => void;
  onEdit: (msg: { id: string; text: string }) => void;
  onDelete: (messageId: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  myId,
  onReply,
  onEdit,
  onDelete
}): React.JSX.Element => {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const { messagesEndRef, handleScroll } = useChatScroll(messages, myId);
  const { menuState, handleContextMenu, closeMenu } = useMessageContextMenu();

  const handleCopyText = (text: string): void => {
    navigator.clipboard.writeText(text).catch((err: unknown) => {
      console.error('Ошибка копирования: ', err);
    });
  };

  const handleJumpToMessage = (targetId: string): void => {
    const targetElement = document.getElementById(`msg-${targetId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(targetId);
      setTimeout((): void => setHighlightedId(null), 1000);
    }
  };

  const getMenuActions = (msg: Message): ContextMenuItem[] => {
    const actions: ContextMenuItem[] = [
      {
        label: 'Ответить',
        onClick: (): void => onReply(msg),
        icon: <ReplyIcon width="12" height="12" />
      },
      {
        label: 'Копировать текст',
        onClick: (): void => handleCopyText(msg.text),
        icon: <CopyIcon width="12" height="12" />
      }
    ];

    if (msg.senderId === myId) {
      actions.push({
        label: 'Редактировать',
        onClick: (): void => onEdit({ id: msg.id, text: msg.text }),
        icon: <EditIcon width="12" height="12" />
      });
      actions.push({
        label: 'Удалить сообщение',
        onClick: (): void => onDelete(msg.id),
        isDanger: true,
        icon: <DeleteIcon width="12" height="12" />
      });
    }

    return actions;
  };

  return (
    <div className="chat-messages" onScroll={handleScroll}>
      {messages.map((msg: Message, index: number): React.JSX.Element | null => {
        const prevMsg: Message | null = index > 0 ? messages[index - 1] : null;

        const isGrouped: boolean = !!(
          prevMsg &&
          !prevMsg.deletedAt &&
          prevMsg.senderId === msg.senderId &&
          !msg.replyTo &&
          msg.createdAt - prevMsg.createdAt < 300000
        );

        return (
          <ChatMessageItem
            key={msg.id}
            msg={msg}
            isGrouped={isGrouped}
            isHighlighted={highlightedId === msg.id}
            onContextMenu={handleContextMenu}
            onReply={onReply}
            onJumpToMessage={handleJumpToMessage}
          />
        );
      })}
      <div ref={messagesEndRef} />

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={getMenuActions(menuState.message)}
          onClose={closeMenu}
        />
      )}
    </div>
  );
};

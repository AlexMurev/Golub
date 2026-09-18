import React, { useCallback, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ContextMenu, ContextMenuItem } from '@renderer/components/ContextMenu/ContextMenu';
import type { Message } from '@shared/types';
import { useMessageContextMenu } from '@renderer/hooks/useMessageContextMenu';
import { ChatMessageItem } from './ChatMessageItem/ChatMessageItem';
import ReplyIcon from '@renderer/assets/reply.svg?react';
import CopyIcon from '@renderer/assets/copy.svg?react';
import EditIcon from '@renderer/assets/edit.svg?react';
import DeleteIcon from '@renderer/assets/delete.svg?react';
import './ChatMessages.css';

interface ChatMessagesProps {
  chatId: string | null;
  messages: Message[];
  myId: string;
  firstItemIndex: number;
  isLoading: boolean;
  hasMore: boolean;
  isLoadingOlder: boolean;
  editingId: string | null;
  bottomInset: number;
  onLoadOlder: () => void;
  onReply: (message: Message) => void;
  onStartEdit: (id: string) => void;
  onSubmitEdit: (id: string, text: string) => void;
  onCancelEdit: () => void;
  onDelete: (messageId: string) => void;
  onSetReaction: (messageId: string, name: string, dataUrl: string) => void;
  onRemoveReaction: (messageId: string) => void;
  onSaveReactionToMy: (name: string, dataUrl: string) => void;
  onOpenReactionPicker: (messageId: string, x: number, y: number) => void;
}

const SmileIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  chatId,
  messages,
  myId,
  firstItemIndex,
  isLoading,
  hasMore,
  isLoadingOlder,
  editingId,
  bottomInset,
  onLoadOlder,
  onReply,
  onStartEdit,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
  onSetReaction,
  onRemoveReaction,
  onSaveReactionToMy,
  onOpenReactionPicker
}): React.JSX.Element => {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { menuState, handleContextMenu, closeMenu } = useMessageContextMenu();

  const visible = useMemo(() => messages.filter((m) => !m.deletedAt), [messages]);

  const handleCopyText = (text: string): void => {
    navigator.clipboard.writeText(text).catch((err: unknown) => {
      console.error('Ошибка копирования: ', err);
    });
  };

  const handleJumpToMessage = useCallback((targetId: string): void => {
    const targetElement = document.getElementById(`msg-${targetId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(targetId);
      setTimeout((): void => setHighlightedId(null), 1000);
    }
  }, []);

  const getMenuActions = (msg: Message, x: number, y: number): ContextMenuItem[] => {
    const actions: ContextMenuItem[] = [
      {
        label: 'Ответить',
        onClick: (): void => onReply(msg),
        icon: <ReplyIcon width={20} height={20} />
      },
      {
        label: 'Реакция',
        onClick: (): void => onOpenReactionPicker(msg.id, x, y),
        icon: <SmileIcon />
      },
      {
        label: 'Копировать текст',
        onClick: (): void => handleCopyText(msg.text),
        icon: <CopyIcon width={20} height={20} />
      }
    ];

    if (msg.senderId === myId) {
      actions.push({
        label: 'Редактировать',
        onClick: (): void => onStartEdit(msg.id),
        icon: <EditIcon width={20} height={20} />
      });
      actions.push({
        label: 'Удалить сообщение',
        onClick: (): void => onDelete(msg.id),
        isDanger: true,
        icon: <DeleteIcon width={20} height={20} />
      });
    }

    return actions;
  };

  if (isLoading || visible.length === 0) {
    return (
      <div className="chat-messages">
        <div className="chat-messages__loader">{isLoading ? 'Загрузка...' : 'Нет сообщений'}</div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      <Virtuoso
        key={chatId ?? 'empty'}
        data={visible}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={visible.length - 1}
        followOutput={(isAtBottom: boolean): false | 'smooth' => (isAtBottom ? 'smooth' : false)}
        startReached={(): void => {
          if (hasMore && !isLoadingOlder) onLoadOlder();
        }}
        itemContent={(index, msg): React.JSX.Element => {
          const localIndex: number = index - firstItemIndex;
          const prevMsg: Message | null = localIndex > 0 ? visible[localIndex - 1] : null;

          const isGrouped: boolean = !!(
            prevMsg &&
            prevMsg.senderId === msg.senderId &&
            !msg.replyTo &&
            msg.createdAt - prevMsg.createdAt < 300000
          );

          return (
            <ChatMessageItem
              msg={msg}
              myId={myId}
              isGrouped={isGrouped}
              isHighlighted={highlightedId === msg.id}
              isEditing={editingId === msg.id}
              onContextMenu={handleContextMenu}
              onReply={onReply}
              onJumpToMessage={handleJumpToMessage}
              onSubmitEdit={onSubmitEdit}
              onCancelEdit={onCancelEdit}
              onSetReaction={onSetReaction}
              onRemoveReaction={onRemoveReaction}
              onSaveReactionToMy={onSaveReactionToMy}
              onOpenReactionPicker={onOpenReactionPicker}
            />
          );
        }}
        components={{
          Footer: (): React.JSX.Element => (
            <div style={{ height: bottomInset }} aria-hidden="true" />
          ),
          Header: (): React.JSX.Element | null =>
            isLoadingOlder ? <div className="chat-messages__loader">Загрузка истории...</div> : null
        }}
        increaseViewportBy={{ top: 600, bottom: 200 }}
        atBottomThreshold={50}
        className="chat-messages__list"
      />

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={getMenuActions(menuState.message, menuState.x, menuState.y)}
          onClose={closeMenu}
        />
      )}
    </div>
  );
};

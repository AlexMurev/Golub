import React, { useState } from 'react';
import { ChatMessages } from './ChatMessages/ChatMessages';
import { ChatReplyPreview } from './ChatReplyPreview/ChatReplyPreview';
import { ChatInput } from './ChatInput/ChatInput';
import { ChatTopBar } from './ChatTopBar/ChatTopBar';
import { useMessages } from '@renderer/hooks/useMessages';
import { useSelf } from '@renderer/hooks/useSelf';
import type { Message, ChatListItem, ReplyPreview } from '@shared/types';
import './Chat.css';

interface ChatProps {
  chat: ChatListItem;
}

const Chat: React.FC<ChatProps> = ({ chat }): React.JSX.Element => {
  const { self } = useSelf();
  const {
    messages,
    isLoading,
    hasMore,
    isLoadingOlder,
    firstItemIndex,
    loadOlder,
    sendMessage,
    editMessage,
    deleteMessage
  } = useMessages(chat.id, self?.peerId ?? null);

  const [input, setInput] = useState<string>('');
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSend = async (): Promise<void> => {
    if (!input.trim()) return;
    await sendMessage(input, replyTo?.id ?? null);
    setReplyTo(null);
    setInput('');
  };

  const handleStartEdit = (id: string): void => {
    setEditingId(id);
    setReplyTo(null);
  };

  const handleSubmitEdit = async (id: string, text: string): Promise<void> => {
    await editMessage(id, text);
    setEditingId(null);
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
  };

  const handleReply = (message: Message): void => {
    setReplyTo({
      id: message.id,
      senderId: message.senderId,
      senderNickname: message.senderNickname,
      senderAvatar: message.senderAvatar,
      text: message.text,
      replyDeleted: false
    });

    setTimeout((): void => {
      const inputEl = document.querySelector(
        '.chat-input-area__message'
      ) as HTMLTextAreaElement | null;
      if (inputEl) inputEl.focus();
    }, 0);
  };

  const cancelReply = (): void => {
    setReplyTo(null);
  };

  const subtitle: string =
    chat.type === 'group' ? 'Групповой чат' : chat.isOnline ? 'в сети' : 'не в сети';

  return (
    <div className="chat">
      <ChatTopBar
        title={chat.title}
        subtitle={subtitle}
        avatar={chat.avatar}
        isOnline={chat.type === 'direct' ? chat.isOnline : undefined}
      />

      <ChatMessages
        chatId={chat.id}
        messages={messages}
        myId={self?.peerId ?? ''}
        firstItemIndex={firstItemIndex}
        isLoading={isLoading}
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
        editingId={editingId}
        onLoadOlder={loadOlder}
        onReply={handleReply}
        onStartEdit={handleStartEdit}
        onSubmitEdit={handleSubmitEdit}
        onCancelEdit={handleCancelEdit}
        onDelete={deleteMessage}
      />

      {replyTo && <ChatReplyPreview replyTo={replyTo} onCancel={cancelReply} />}

      <ChatInput
        input={input}
        setInput={setInput}
        sendMessage={handleSend}
        isConnected={true}
        hasReply={!!replyTo}
      />
    </div>
  );
};

export default Chat;

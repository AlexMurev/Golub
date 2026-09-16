import React from 'react';
import { ChatMessages } from './ChatMessages/ChatMessages';
import { ChatReplyPreview } from './ChatReplyPreview/ChatReplyPreview';
import { ChatInput } from './ChatInput/ChatInput';
import { ChatTopBar } from './ChatTopBar/ChatTopBar';
import type { Message, ChatListItem, ReplyPreview } from '@shared/types';
import './Chat.css';

interface ChatProps {
  chat: ChatListItem;
  messages: Message[];
  myId: string;
  firstItemIndex: number;
  isLoading: boolean;
  hasMore: boolean;
  isLoadingOlder: boolean;
  editingId: string | null;
  onLoadOlder: () => void;
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  deleteMessage: (messageId: string) => void;
  onStartEdit: (id: string) => void;
  onSubmitEdit: (id: string, text: string) => void;
  onCancelEdit: () => void;
  replyTo: ReplyPreview | null;
  setReplyTo: (value: ReplyPreview | null) => void;
}

const Chat: React.FC<ChatProps> = ({
  chat,
  messages,
  myId,
  firstItemIndex,
  isLoading,
  hasMore,
  isLoadingOlder,
  editingId,
  onLoadOlder,
  input,
  setInput,
  sendMessage,
  deleteMessage,
  onStartEdit,
  onSubmitEdit,
  onCancelEdit,
  replyTo,
  setReplyTo
}): React.JSX.Element => {
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
        myId={myId}
        firstItemIndex={firstItemIndex}
        isLoading={isLoading}
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
        editingId={editingId}
        onLoadOlder={onLoadOlder}
        onReply={handleReply}
        onStartEdit={onStartEdit}
        onSubmitEdit={onSubmitEdit}
        onCancelEdit={onCancelEdit}
        onDelete={deleteMessage}
      />

      {replyTo && <ChatReplyPreview replyTo={replyTo} onCancel={cancelReply} />}

      <ChatInput
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isConnected={true}
        hasReply={!!replyTo}
      />
    </div>
  );
};

export default Chat;

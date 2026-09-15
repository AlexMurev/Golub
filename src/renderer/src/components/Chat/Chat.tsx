import React from 'react';
import { ChatMessages } from './ChatMessages/ChatMessages';
import { ChatReplyPreview } from './ChatReplyPreview/ChatReplyPreview';
import { ChatEditPreview } from './ChatEditPreview/ChatEditPreview';
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
  onLoadOlder: () => void;
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  deleteMessage: (messageId: string) => void;
  onStartEdit: (msg: { id: string; text: string }) => void;
  isEditing: boolean;
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
  onLoadOlder,
  input,
  setInput,
  sendMessage,
  deleteMessage,
  onStartEdit,
  isEditing,
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
        onLoadOlder={onLoadOlder}
        onReply={handleReply}
        onDelete={deleteMessage}
        onEdit={onStartEdit}
      />

      {isEditing && <ChatEditPreview onCancel={onCancelEdit} />}

      {replyTo && !isEditing && <ChatReplyPreview replyTo={replyTo} onCancel={cancelReply} />}

      <ChatInput
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isConnected={true}
        hasReply={!!replyTo || isEditing}
      />
    </div>
  );
};

export default Chat;

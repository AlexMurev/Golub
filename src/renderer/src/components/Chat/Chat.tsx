import React from 'react';
import { ChatMessages } from './ChatMessages/ChatMessages';
import { ChatReplyPreview } from './ChatReplyPreview/ChatReplyPreview';
import { ChatInput } from './ChatInput/ChatInput';
import { ChatTopBar } from './ChatTopBar/ChatTopBar';
import './Chat.css';

export interface Message {
  id: string;
  senderId: string;
  senderNickname: string;
  senderAvatar?: string;
  text: string;
  createdAt: number;
  replyTo?: {
    id: string;
    senderId: string;
    senderNickname: string;
    senderAvatar?: string;
    text: string;
  };
}

interface ChatProps {
  messages: Message[];
  myId: string;
  nickname: string;
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  isServerRunning: boolean;
  isConnected: boolean;
  replyTo: NonNullable<Message['replyTo']> | null;
  setReplyTo: (value: NonNullable<Message['replyTo']> | null) => void;
  onOpenSettings: () => void;
}

const Chat: React.FC<ChatProps> = ({
  messages,
  myId,
  input,
  setInput,
  sendMessage,
  isServerRunning,
  isConnected,
  replyTo,
  setReplyTo
}): React.JSX.Element => {
  const handleReply = (message: Message): void => {
    setReplyTo({
      id: message.id,
      senderId: message.senderId,
      senderNickname: message.senderNickname,
      senderAvatar: message.senderAvatar,
      text: message.text
    });

    setTimeout(() => {
      const inputEl = document.querySelector('.chat-input-area__message') as HTMLInputElement;
      if (inputEl) inputEl.focus();
    }, 0);
  };

  const cancelReply = (): void => {
    setReplyTo(null);
  };

  return (
    <div className="chat">
      <ChatTopBar isConnected={isConnected} isServerRunning={isServerRunning} />

      <ChatMessages messages={messages} myId={myId} onReply={handleReply} />

      {replyTo && <ChatReplyPreview replyTo={replyTo} onCancel={cancelReply} />}

      <ChatInput
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isConnected={isConnected}
        hasReply={!!replyTo}
      />
    </div>
  );
};

export default Chat;

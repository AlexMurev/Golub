import React from 'react';
import { ChatHeader } from './ChatHeader/ChatHeader';
import { ChatMessages } from './ChatMessages/ChatMessages';
import { ChatReplyPreview } from './ChatReplyPreview/ChatReplyPreview';
import { ChatInput } from './ChatInput/ChatInput';
import './Chat.css';

export interface Message {
  id: string;
  senderId: string;
  senderNickname: string;
  text: string;
  replyTo?: {
    id: string;
    senderId: string;
    senderNickname: string;
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
  replyTo: { id: string; senderId: string; senderNickname: string; text: string } | null;
  setReplyTo: (
    value: { id: string; senderId: string; senderNickname: string; text: string } | null
  ) => void;
  onOpenSettings: () => void;
}

const Chat: React.FC<ChatProps> = ({
  messages,
  myId,
  nickname,
  input,
  setInput,
  sendMessage,
  isServerRunning,
  isConnected,
  replyTo,
  setReplyTo,
  onOpenSettings
}) => {
  const handleReply = (message: Message): void => {
    setReplyTo({
      id: message.id,
      senderId: message.senderId,
      senderNickname: message.senderNickname,
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
      <ChatHeader
        nickname={nickname}
        isServerRunning={isServerRunning}
        isConnected={isConnected}
        onOpenSettings={onOpenSettings}
      />

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

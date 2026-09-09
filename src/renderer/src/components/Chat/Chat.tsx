import React from 'react';
import { ChatHeader } from './ChatHeader/ChatHeader';
import { ChatMessages } from './ChatMessages/ChatMessages';
import { ChatReplyPreview } from './ChatReplyPreview/ChatReplyPreview';
import { ChatInput } from './ChatInput/ChatInput';
import './Chat.css';

interface Message {
  id: string;
  sender: string;
  text: string;
  replyTo?: {
    id: string;
    sender: string;
    text: string;
  };
}

interface ChatProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  serverAddress: string;
  setServerAddress: (value: string) => void;
  isServerRunning: boolean;
  startServer: () => void;
  connectToServer: () => void;
  isConnected: boolean;
  replyTo: { id: string; sender: string; text: string } | null;
  setReplyTo: (value: { id: string; sender: string; text: string } | null) => void;
}

const Chat: React.FC<ChatProps> = ({
  messages,
  input,
  setInput,
  sendMessage,
  serverAddress,
  setServerAddress,
  isServerRunning,
  startServer,
  connectToServer,
  isConnected,
  replyTo,
  setReplyTo
}) => {
  const handleReply = (message: Message): void => {
    setReplyTo({
      id: message.id,
      sender: message.sender,
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
        serverAddress={serverAddress}
        setServerAddress={setServerAddress}
        isServerRunning={isServerRunning}
        startServer={startServer}
        connectToServer={connectToServer}
        isConnected={isConnected}
      />

      <ChatMessages messages={messages} onReply={handleReply} />

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

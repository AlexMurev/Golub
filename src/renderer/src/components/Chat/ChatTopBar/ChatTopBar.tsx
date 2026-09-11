import React from 'react';
import './ChatTopBar.css';

interface ChatTopBarProps {
  isConnected: boolean;
  isServerRunning: boolean;
}

export const ChatTopBar: React.FC<ChatTopBarProps> = ({
  isConnected,
  isServerRunning
}): React.JSX.Element => {
  const getTitle = (): string => {
    if (!isConnected) return 'сеть-отключена';
    return isServerRunning ? 'генеральный-хост' : 'комната-клиента';
  };

  return (
    <div className="chat-top-bar">
      <span className="chat-top-bar__hashtag">#</span>
      <span className="chat-top-bar__title">{getTitle()}</span>
    </div>
  );
};

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
  return (
    <div className="chat-top-bar">
      <span className="chat-top-bar__hashtag">#</span>
      <span className="chat-top-bar__title">
        {isConnected
          ? isServerRunning
            ? 'генеральный-хост'
            : 'комната-клиента'
          : 'сеть-отключена'}
      </span>
    </div>
  );
};

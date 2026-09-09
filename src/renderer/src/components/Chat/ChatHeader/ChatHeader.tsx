import React from 'react';
import './ChatHeader.css';

interface ChatHeaderProps {
  serverAddress: string;
  setServerAddress: (value: string) => void;
  isServerRunning: boolean;
  startServer: () => void;
  connectToServer: () => void;
  isConnected: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  serverAddress,
  setServerAddress,
  isServerRunning,
  startServer,
  connectToServer,
  isConnected
}) => {
  return (
    <header className="chat-header">
      <span
        className={`chat-header__status ${
          isServerRunning ? 'chat-header__status--host' : 'chat-header__status--client'
        }`}
      >
        {isServerRunning ? 'Хост' : 'Клиент'}
      </span>
      <span
        className={`chat-header__status ${
          isConnected ? 'chat-header__status--connected' : 'chat-header__status--disconnected'
        }`}
      >
        {isConnected ? 'Подключено' : 'Отключено'}
      </span>
      <input
        className="chat-header__input-address"
        type="text"
        value={serverAddress}
        onChange={(e) => setServerAddress(e.target.value)}
        placeholder="ws://localhost:8080"
      />
      <button
        className="chat-header__button chat-header__button--primary"
        onClick={startServer}
        disabled={isServerRunning}
      >
        {isServerRunning ? 'Сервер запущен' : 'Стать хостом'}
      </button>
      <button
        className={`chat-header__button ${isConnected ? 'chat-header__button--danger' : ''}`}
        onClick={connectToServer}
      >
        {isConnected ? 'Отключиться' : 'Подключиться'}
      </button>
    </header>
  );
};

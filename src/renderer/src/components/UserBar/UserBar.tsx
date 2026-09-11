import React from 'react';
import './UserBar.css';

interface UserBarProps {
  nickname: string;
  avatar?: string;
  isServerRunning: boolean;
  isConnected: boolean;
  onOpenSettings: () => void;
}

export const UserBar: React.FC<UserBarProps> = ({
  nickname,
  avatar,
  isServerRunning,
  isConnected,
  onOpenSettings
}): React.JSX.Element => {
  const getStatusModifier = (): string => {
    if (!isConnected) return 'user-bar__status-badge--disconnected';
    return isServerRunning
      ? 'user-bar__status-badge--connected-host'
      : 'user-bar__status-badge--connected-client';
  };

  const getStatusText = (): string => {
    if (!isConnected) return 'Отключено';
    return isServerRunning ? 'Хост' : 'Клиент';
  };

  return (
    <div className="user-bar">
      <div className="user-bar__profile-wrapper">
        {/* Блок аватарки с индикатором статуса сети поверх нее */}
        <div className="user-bar__avatar-container">
          {avatar ? (
            <img src={avatar} alt={nickname} className="user-bar__avatar" />
          ) : (
            <div className="user-bar__avatar-placeholder">
              {nickname.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
          <div className={`user-bar__status-badge ${getStatusModifier()}`} />
        </div>

        <div className="user-bar__profile">
          <span className="user-bar__nickname" title={nickname}>
            {nickname}
          </span>
          <span className="user-bar__status-text">{getStatusText()}</span>
        </div>
      </div>

      <button className="user-bar__settings" onClick={onOpenSettings} title="Настройки">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  );
};

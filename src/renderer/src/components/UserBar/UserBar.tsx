import React from 'react';
import SettingsIcon from '@renderer/assets/settings.svg?react';
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
            <div className="user-bar__avatar user-bar__avatar--placeholder">
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
        <SettingsIcon width={20} height={20} />
      </button>
    </div>
  );
};

import React from 'react';
import { useSelf } from '@renderer/hooks/useSelf';
import SettingsIcon from '@renderer/assets/settings.svg?react';
import './UserBar.css';

interface UserBarProps {
  onOpenSettings: () => void;
}

// TODO: заменить заглушки, когда появится реальный источник данных о сетевом статусе
const IS_SERVER_RUNNING = true;
const IS_CONNECTED = true;

export const UserBar: React.FC<UserBarProps> = ({ onOpenSettings }): React.JSX.Element | null => {
  const { self } = useSelf();

  if (!self) return null;

  const getStatusModifier = (): string => {
    if (!IS_CONNECTED) return 'user-bar__status-badge--disconnected';
    return IS_SERVER_RUNNING
      ? 'user-bar__status-badge--connected-host'
      : 'user-bar__status-badge--connected-client';
  };

  const getStatusText = (): string => {
    if (!IS_CONNECTED) return 'Отключено';
    return IS_SERVER_RUNNING ? 'Хост' : 'Клиент';
  };

  return (
    <div className="user-bar">
      <div className="user-bar__profile-wrapper">
        {/* Блок аватарки с индикатором статуса сети поверх нее */}
        <div className="user-bar__avatar-container">
          {self.avatar ? (
            <img src={self.avatar} alt={self.nickname} className="user-bar__avatar" />
          ) : (
            <div className="user-bar__avatar user-bar__avatar--placeholder">
              {self.nickname.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
          <div className={`user-bar__status-badge ${getStatusModifier()}`} />
        </div>

        <div className="user-bar__profile">
          <span className="user-bar__nickname" title={self.nickname}>
            {self.nickname}
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

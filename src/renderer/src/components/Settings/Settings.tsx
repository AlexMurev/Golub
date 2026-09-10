import React from 'react';
import './Settings.css';

interface SettingsProps {
  nickname: string;
  setNickname: (value: string) => void;
  userId: string;
  serverAddress: string;
  setServerAddress: (value: string) => void;
  isServerRunning: boolean;
  startServer: () => void;
  connectToServer: () => void;
  isConnected: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  nickname,
  setNickname,
  userId,
  serverAddress,
  setServerAddress,
  isServerRunning,
  startServer,
  connectToServer,
  isConnected,
  onClose
}): React.JSX.Element => {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings" onClick={(e: React.MouseEvent): void => e.stopPropagation()}>
        <header className="settings__header">
          <h2 className="settings__title">Настройки</h2>
          <button className="settings__close" onClick={onClose} title="Закрыть">
            ✕
          </button>
        </header>

        <div className="settings__body">
          <section className="settings__section">
            <h3 className="settings__section-title">Профиль</h3>
            <label className="settings__field">
              <span className="settings__label">Ник</span>
              <input
                className="settings__input"
                type="text"
                value={nickname}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setNickname(e.target.value)
                }
                placeholder="Аноним"
                maxLength={32}
              />
            </label>
            <div className="settings__field">
              <span className="settings__label">Ваш ID</span>
              <div className="settings__id">{userId}</div>
            </div>
          </section>

          <section className="settings__section">
            <h3 className="settings__section-title">Соединение</h3>
            <label className="settings__field">
              <span className="settings__label">Адрес сервера</span>
              <input
                className="settings__input"
                type="text"
                value={serverAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setServerAddress(e.target.value)
                }
                placeholder="ws://localhost:8080"
              />
            </label>

            <div className="settings__actions">
              <button
                className="settings__button settings__button--primary"
                onClick={startServer}
                disabled={isServerRunning}
              >
                {isServerRunning ? 'Сервер запущен' : 'Стать хостом'}
              </button>
              <button
                className={`settings__button ${isConnected ? 'settings__button--danger' : ''}`}
                onClick={connectToServer}
              >
                {isConnected ? 'Отключиться' : 'Подключиться'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
